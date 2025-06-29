import os
import json
import re

def compute_bbox(coords):
    xs = [pt[0] for pt in coords]
    ys = [pt[1] for pt in coords]
    return [min(xs), min(ys), max(xs), max(ys)]

def extract_frame_number(filename):
    # Try to extract a number from the filename (e.g., frame_000001 or image_001)
    match = re.search(r'(\d+)', filename)
    return int(match.group(1)) if match else -1

def generate_meta_json(masks_dir):
    meta_dir = masks_dir  # Save meta.json in the same directory
    os.makedirs(meta_dir, exist_ok=True)
    # Get all JSON files except meta.json
    files = [f for f in os.listdir(masks_dir) if f.endswith('.json') and f != 'meta.json']
    if not files:
        print("No JSON files found")
        return
    # Sort files by frame number or alphabetically if no number
    files_sorted = sorted(files, key=extract_frame_number)
    meta = {}
    for idx, fname in enumerate(files_sorted):
        frame_num = extract_frame_number(fname)
        # For each frame, create metadata for the NEXT frame
        next_frame_num = frame_num + 1
        next_frame_key = f'frame_{next_frame_num:06d}' if frame_num != -1 else f'file_{idx+1}'
        print(f"Processing {fname} (frame {frame_num}) -> creating meta for {next_frame_key}")
        try:
            with open(os.path.join(masks_dir, fname), 'r') as f:
                data = json.load(f)
            meta[next_frame_key] = []
            # Process each class and instance
            for cls in data.get('classes', []):
                class_name = cls.get('className', 'unknown')
                for inst in cls.get('instances', []):
                    coords = inst.get('coordinates', [])
                    bbox = compute_bbox(coords) if coords else None
                    if bbox:  # Only add if we have valid bbox
                        meta_entry = {
                            'instanceId': inst.get('instanceId', ''),
                            'name': inst.get('name', 'Object'),
                            'className': class_name,
                            'bbox': bbox,
                            'coordinates': coords
                        }
                        meta[next_frame_key].append(meta_entry)
                        print(f"  Added meta for {class_name}:{inst.get('instanceId', 'unknown')}")
        except Exception as e:
            print(f"Error processing {fname}: {e}")
            continue
    # Save metadata
    out_path = os.path.join(meta_dir, 'meta.json')
    with open(out_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"\nMeta JSON saved to {out_path}")
    print(f"Created metadata for {len(meta)} future frames")

def main():
    base_dir = os.path.dirname(__file__)
    masks_dir = os.path.join(base_dir, 'masks')
    generate_meta_json(masks_dir)

if __name__ == '__main__':
    main() 