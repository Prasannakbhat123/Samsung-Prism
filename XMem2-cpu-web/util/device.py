import os

# Let ops that MPS doesn't implement yet fall back to CPU instead of crashing.
# Must be set before torch dispatches any MPS op.
os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK', '1')

import torch


def get_device() -> torch.device:
    """Pick the inference device.

    Honours PRISM_DEVICE (cpu / cuda / cuda:1 / mps); otherwise prefers
    CUDA, then Apple Silicon MPS, then CPU.
    """
    choice = os.environ.get('PRISM_DEVICE', 'auto').strip().lower()
    if choice and choice != 'auto':
        return torch.device(choice)
    if torch.cuda.is_available():
        return torch.device('cuda')
    if torch.backends.mps.is_available():
        return torch.device('mps')
    return torch.device('cpu')
