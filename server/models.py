"""RITM (click-to-segment) and XMem (mask propagation), loaded once and shared."""
import threading
import time

import numpy as np
import torch
import torch.nn.functional as F
from torchvision import transforms
from torchvision.transforms import InterpolationMode

from . import config  # noqa: F401  (puts RITM/XMem on sys.path)
from .geometry import mask_to_polygons
from .store import BadRequest, Project


def get_device() -> torch.device:
    from util.device import get_device as xmem_get_device  # XMem's helper, honours PRISM_DEVICE
    return xmem_get_device()


class _LazyModel:
    """Loads on first use (or via warm_up) and reports its status."""

    def __init__(self, name):
        self.name = name
        self._model = None
        self._error = None
        self._lock = threading.Lock()

    def _load(self):
        raise NotImplementedError

    def get(self):
        with self._lock:
            if self._model is None:
                try:
                    t = time.time()
                    self._model = self._load()
                    print(f'[prism] {self.name} loaded on {self.device} in {time.time() - t:.1f}s', flush=True)
                except Exception as e:
                    self._error = f'{type(e).__name__}: {e}'
                    raise
            return self._model

    def status(self):
        if self._model is not None:
            return 'ready'
        return f'error: {self._error}' if self._error else 'loading'


# ---- RITM ---------------------------------------------------------------------
class RitmSession:
    """Click state for one object on one frame."""

    def __init__(self, net, device, project: str, frame: str, image: np.ndarray):
        from isegm.inference import clicker
        from isegm.inference.predictors import get_predictor
        self._clicker_mod = clicker
        self.key = (project, frame)
        self.predictor = get_predictor(net, 'NoBRS', device=device, prob_thresh=0.5)
        self.predictor.set_input_image(image)
        self.clicker = clicker.Clicker()
        self.prob = None
        self.history = []

    def add_click(self, x, y, positive):
        self.history.append((self.clicker.get_state(), self.predictor.get_states(), self.prob))
        self.clicker.add_click(self._clicker_mod.Click(is_positive=positive, coords=(y, x)))
        self.prob = self.predictor.get_prediction(self.clicker)

    def undo(self):
        if self.history:
            clicks, states, self.prob = self.history.pop()
            self.clicker.set_state(clicks)
            self.predictor.set_states(states)

    def state(self):
        polygons = mask_to_polygons(self.prob > 0.5) if self.prob is not None else []
        clicks = [{'x': int(c.coords[1]), 'y': int(c.coords[0]), 'positive': bool(c.is_positive)}
                  for c in self.clicker.get_clicks()]
        return {'polygons': polygons, 'clicks': clicks}


class RitmService(_LazyModel):
    def __init__(self):
        super().__init__('RITM')
        self.device = get_device()
        self.session = None  # single-user tool: one active object at a time
        self._op_lock = threading.Lock()

    def _load(self):
        from isegm.utils.serialization import load_model
        ckpt = torch.load(config.RITM_WEIGHTS, map_location='cpu', weights_only=False)
        net = load_model(ckpt['config'], cpu_dist_maps=False)
        net.load_state_dict(ckpt['state_dict'], strict=False)
        return net.to(self.device).eval().requires_grad_(False)

    def _session(self, project: Project, frame: str) -> RitmSession:
        if self.session is None or self.session.key != (project.name, frame):
            self.session = RitmSession(self.get(), self.device, project.name, frame, project.load_image(frame))
        return self.session

    def click(self, project, frame, x, y, positive):
        with self._op_lock, torch.no_grad():
            s = self._session(project, frame)
            s.add_click(float(x), float(y), bool(positive))
            return s.state()

    def undo(self, project, frame):
        with self._op_lock:
            s = self._session(project, frame)
            s.undo()
            return s.state()

    def reset(self):
        with self._op_lock:
            self.session = None
        return {'polygons': [], 'clicks': []}


# ---- XMem -----------------------------------------------------------------------
class XMemService(_LazyModel):
    def __init__(self):
        super().__init__('XMem')
        self.device = get_device()
        self._run_lock = threading.Lock()

    def _load(self):
        from model.network import XMem
        from util.configuration import VIDEO_INFERENCE_CONFIG
        weights = torch.load(config.XMEM_WEIGHTS, map_location='cpu', weights_only=False)
        net = XMem(dict(VIDEO_INFERENCE_CONFIG), str(config.XMEM_WEIGHTS),
                   pretrained_key_encoder=False, pretrained_value_encoder=False)
        net.load_weights(weights, init_as_zero_if_needed=True)
        return net.to(self.device).eval()

    MAX_REFERENCES = 10  # earlier keyframes kept in XMem's permanent memory

    def propagate(self, project: Project, start: str, count: int) -> dict:
        """Carry the objects on `start` forward through the next `count` frames.

        Only frames up to the one being predicted are used: the hand-labelled
        keyframes before `start` (nearest MAX_REFERENCES) and `start` itself go
        into permanent memory. Keyframes inside the range are never overwritten;
        when tracking reaches one it is used as a new reference instead.
        """
        from dataset.range_transform import im_normalization
        from inference.inference_core import InferenceCore
        from util.configuration import VIDEO_INFERENCE_CONFIG

        names = project.frame_names()
        i0 = names.index(project.check_frame(start))
        targets = names[i0 + 1: i0 + 1 + max(0, int(count))]
        if not targets:
            raise BadRequest('No frames after this one to track to')
        objects = project.read_objects(start)
        if not objects:
            raise BadRequest('Annotate at least one object on this frame first')

        ids = [o['id'] for o in objects]
        meta = {o['id']: {k: o[k] for k in ('id', 'name', 'className')} for o in objects}
        labels = list(range(1, len(ids) + 1))
        references = [n for n in names[:i0] if project.is_keyframe(n)][-self.MAX_REFERENCES:]

        cfg = dict(VIDEO_INFERENCE_CONFIG)
        cfg['enable_long_term_count_usage'] = (
            (len(targets) + len(references) + 1) / (cfg['max_mid_term_frames'] - cfg['min_mid_term_frames'])
            * cfg['num_prototypes'] >= cfg['max_long_term_elements'])
        to_tensor = transforms.Compose([
            transforms.ToTensor(), im_normalization,
            transforms.Resize(cfg['size'], interpolation=InterpolationMode.BILINEAR, antialias=True)])

        def encode(name, frame_objects=None):
            """(image tensor, one-hot mask of the tracked ids) for a frame, at XMem's working size."""
            rgb = to_tensor(project.load_image(name)).to(self.device)
            mask = project.label_mask(name, ids, frame_objects)
            onehot = torch.from_numpy(np.stack([mask == l for l in labels])).float()
            onehot = F.interpolate(onehot[None], rgb.shape[-2:], mode='nearest')[0].to(self.device)
            return rgb, onehot

        written, kept = [], []
        net = self.get()
        with self._run_lock, torch.no_grad():
            processor = InferenceCore(net, config=cfg)
            processor.set_all_labels(labels)

            for name in references:
                rgb, onehot = encode(name)
                if onehot.any():
                    processor.put_to_permanent_memory(rgb, onehot, ti=names.index(name))

            rgb, onehot = encode(start, objects)
            processor.put_to_permanent_memory(rgb, onehot, ti=i0)
            processor.step(rgb, onehot, labels, do_not_add_mask_to_memory=True)

            for k, name in enumerate(targets):
                end = k == len(targets) - 1
                frame_objects, source = project.read_annotation(name)
                if source not in (None, 'xmem'):
                    # A person labelled this frame: keep it and learn from it.
                    rgb, onehot = encode(name, frame_objects)
                    processor.put_to_permanent_memory(rgb, onehot, ti=names.index(name))
                    processor.step(rgb, onehot, labels, end=end, do_not_add_mask_to_memory=True)
                    for o in frame_objects:
                        if o['id'] in meta:
                            meta[o['id']] = {k2: o[k2] for k2 in ('id', 'name', 'className')}
                    kept.append(name)
                    continue

                image = project.load_image(name)
                prob = processor.step(to_tensor(image).to(self.device), end=end)
                prob = F.interpolate(prob[None], image.shape[:2], mode='bilinear', align_corners=False)[0]
                out = torch.argmax(prob, dim=0).cpu().numpy()
                tracked = []
                for label, oid in zip(labels, ids):
                    polygons = mask_to_polygons(out == label)
                    if polygons:
                        tracked.append({**meta[oid], 'polygons': polygons})
                project.write_objects(name, tracked, source='xmem')
                written.append(name)
        return {'frames': written, 'kept': kept, 'references': len(references) + 1}


ritm = RitmService()
xmem = XMemService()


def warm_up():
    for svc in (ritm, xmem):
        try:
            svc.get()
        except Exception as e:
            print(f'[prism] {svc.name} failed to load: {e}', flush=True)
