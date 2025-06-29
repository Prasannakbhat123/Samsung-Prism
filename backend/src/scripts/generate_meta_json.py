import os
import json
import re

def compute_bbox(coords):
    xs = [pt[0] for pt in coords]
    ys = [pt[1] for pt in coords]
    return [min(xs), min(ys), max(xs), max(ys)]

def extract_frame_number(filename):
    match = re.search(r'(\d+)', filename)
    return int(match.group(1)) if match else -1

def main():
    json_dir = os.path.join(os.path.dirname(__file__), '../json')
    files = [f for f in os.listdir(json_dir) if f.endswith('.json') and f != 'meta.json']
    # Sort files by frame number
    files_sorted = sorted(files, key=extract_frame_number)
    meta = {}
    for idx, fname in enumerate(files_sorted):
        if idx == 0:
            continue  # No previous frame for the first frame
        prev_fname = files_sorted[idx - 1]
        frame_key = os.path.splitext(fname)[0]  # meta for this frame
        with open(os.path.join(json_dir, prev_fname), 'r') as f:
            data = json.load(f)
        meta[frame_key] = []
        for cls in data.get('classes', []):
            for inst in cls.get('instances', []):
                coords = inst.get('coordinates', [])
                bbox = compute_bbox(coords) if coords else None
                meta[frame_key].append({
                    'instanceId': inst.get('instanceId', ''),
                    'name': inst.get('name', ''),
                    'bbox': bbox
                })
    out_path = os.path.join(json_dir, 'meta.json')
    with open(out_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"Meta JSON saved to {out_path}")

if __name__ == '__main__':
    main() 