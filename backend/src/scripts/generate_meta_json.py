# import os
# import json
# import re

# def compute_bbox(coords):
#     xs = [pt[0] for pt in coords]
#     ys = [pt[1] for pt in coords]
#     return [min(xs), min(ys), max(xs), max(ys)]

# def extract_frame_number(filename):
#     match = re.search(r'(\d+)', filename)
#     return int(match.group(1)) if match else -1

# def main():
#     base_dir = os.path.dirname(__file__)
#     json_dir = os.path.join(base_dir, '../json')
#     meta_dir = os.path.join(base_dir, '../predicted_masks')
#     os.makedirs(meta_dir, exist_ok=True)
#     files = [f for f in os.listdir(json_dir) if f.endswith('.json') and f != 'meta.json']
#     # Sort files by frame number
#     files_sorted = sorted(files, key=extract_frame_number)
#     meta = {}
#     for idx, fname in enumerate(files_sorted):
#         if idx == 0:
#             continue  # No previous frame for the first frame
#         prev_fname = files_sorted[idx]
#         frame_key = os.path.splitext(fname)[0]  # meta for this frame
#         with open(os.path.join(json_dir, prev_fname), 'r') as f:
#             data = json.load(f)
#         meta[frame_key] = []
#         for cls in data.get('classes', []):
#             for inst in cls.get('instances', []):
#                 coords = inst.get('coordinates', [])
#                 bbox = compute_bbox(coords) if coords else None
#                 meta[frame_key].append({
#                     'instanceId': inst.get('instanceId', ''),
#                     'name': inst.get('name', ''),
#                     'bbox': bbox
#                 })
#     out_path = os.path.join(meta_dir, 'meta.json')
#     with open(out_path, 'w') as f:
#         json.dump(meta, f, indent=2)
#     print(f"Meta JSON saved to {out_path}")

# if __name__ == '__main__':
#     main() 

#!/usr/bin/env python3

import os
import json
import re

def compute_bbox(coords):
    """Compute bounding box from polygon coordinates"""
    xs = [pt[0] for pt in coords]
    ys = [pt[1] for pt in coords]
    return [min(xs), min(ys), max(xs), max(ys)]

def extract_frame_number(filename):
    """Extract frame number from filename"""
    match = re.search(r'frame_(\d+)', filename)
    return int(match.group(1)) if match else -1

def main():
    base_dir = os.path.dirname(__file__)
    json_dir = os.path.join(base_dir, '../json')
    meta_dir = os.path.join(base_dir, '../predicted_masks')
    
    os.makedirs(meta_dir, exist_ok=True)
    
    # Get all JSON files except meta.json
    files = [f for f in os.listdir(json_dir) if f.endswith('.json') and f != 'meta.json']
    
    if not files:
        print("No JSON files found")
        return
    
    # Sort files by frame number
    files_sorted = sorted(files, key=extract_frame_number)
    
    meta = {}
    
    for idx, fname in enumerate(files_sorted):
        frame_num = extract_frame_number(fname)
        
        # For each frame, we need to create metadata for the NEXT frame
        # So the next frame can use this frame's data for tracking
        next_frame_num = frame_num + 1
        next_frame_key = f'frame_{next_frame_num:06d}'
        
        print(f"Processing {fname} (frame {frame_num}) -> creating meta for frame {next_frame_num}")
        
        try:
            with open(os.path.join(json_dir, fname), 'r') as f:
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
                            'className': class_name,  # Add class name to metadata
                            'bbox': bbox,
                            'coordinates': coords  # Keep original coordinates for reference
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

if __name__ == '__main__':
    main()