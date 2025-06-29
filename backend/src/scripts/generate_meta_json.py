import os
import json

def compute_bbox(coords):
    xs = [pt[0] for pt in coords]
    ys = [pt[1] for pt in coords]
    return [min(xs), min(ys), max(xs), max(ys)]

def main():
    json_dir = os.path.join(os.path.dirname(__file__), '../json')
    meta = {}
    for fname in os.listdir(json_dir):
        if not fname.endswith('.json'):
            continue
        frame_key = os.path.splitext(fname)[0]
        with open(os.path.join(json_dir, fname), 'r') as f:
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