#!/usr/bin/env python3

import json
import os
import numpy as np
import cv2
from PIL import Image
import glob
import argparse

def compute_bbox(points):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return [min(xs), min(ys), max(xs), max(ys)]

def compute_iou(boxA, boxB):
    # box: [x_min, y_min, x_max, y_max]
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    
    interArea = max(0, xB - xA) * max(0, yB - yA)
    if interArea == 0:
        return 0
    
    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
    
    iou = interArea / float(boxAArea + boxBArea - interArea + 1e-6)
    return iou

def compute_center_distance(boxA, boxB):
    """Compute normalized distance between box centers"""
    centerA = [(boxA[0] + boxA[2]) / 2, (boxA[1] + boxA[3]) / 2]
    centerB = [(boxB[0] + boxB[2]) / 2, (boxB[1] + boxB[3]) / 2]
    
    dist = ((centerA[0] - centerB[0]) ** 2 + (centerA[1] - centerB[1]) ** 2) ** 0.5
    
    # Normalize by average box size
    avg_size = ((boxA[2] - boxA[0]) + (boxA[3] - boxA[1]) + (boxB[2] - boxB[0]) + (boxB[3] - boxB[1])) / 4
    normalized_dist = dist / (avg_size + 1e-6)
    
    return normalized_dist

def load_meta(meta_path):
    if not os.path.exists(meta_path):
        print(f"Meta file not found: {meta_path}")
        return {}
    try:
        with open(meta_path, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading meta file: {e}")
        return {}

def find_best_match(bbox, meta_instances, used_meta):
    """Find the best matching instance from metadata"""
    best_score = 0
    best_meta = None
    
    for idx, meta_inst in enumerate(meta_instances):
        if idx in used_meta:
            continue
            
        meta_bbox = meta_inst.get('bbox')
        if not meta_bbox:
            continue
        
        # Calculate IoU
        iou = compute_iou(bbox, meta_bbox)
        
        # Calculate center distance (lower is better, so invert it)
        center_dist = compute_center_distance(bbox, meta_bbox)
        distance_score = max(0, 1 - center_dist) if center_dist < 2 else 0
        
        # Combined score (IoU is primary, distance is secondary)
        combined_score = 0.7 * iou + 0.3 * distance_score
        
        if combined_score > best_score:
            best_score = combined_score
            best_meta = (idx, meta_inst, combined_score)
    
    return best_meta

def mask_to_json(mask_path, output_dir, meta_path=None):
    """
    Convert a mask image back to JSON format with polygon annotations.
    Each color in the mask will be converted to a separate class with polygon coordinates.
    """
    try:
        # Read the mask file
        mask = cv2.imread(mask_path)
        if mask is None:
            raise ValueError(f"Could not read mask file: {mask_path}")

        # Get image name (will be used for JSON)
        mask_name = os.path.basename(mask_path)
        image_name = mask_name.replace('.png', '.jpg')

        print(f"Processing mask: {mask_name}")

        # Initialize JSON structure
        json_data = {
            'imageName': image_name,
            'classes': []
        }

        # Define colors for different classes (BGR format)
        colors = {
            (0, 0, 255): "1",    # Red
            (255, 0, 0): "2",    # Blue
            (0, 255, 0): "3",    # Green
            (255, 255, 0): "4",  # Cyan
            (255, 0, 255): "5",  # Magenta
            (0, 255, 255): "6",  # Yellow
            (128, 0, 128): "7",  # Purple
            (255, 165, 0): "8",  # Orange
        }

        # Load meta JSON
        meta = load_meta(meta_path) if meta_path else {}
        frame_key = os.path.splitext(mask_name)[0]  # e.g., frame_000001
        meta_instances = meta.get(frame_key, [])
        used_meta = set()

        print(f"Found {len(meta_instances)} meta instances for {frame_key}")

        # Group instances by class from metadata
        class_groups = {}
        
        # Process each color/class
        for color, default_class_name in colors.items():
            # Create binary mask for this color
            color_mask = cv2.inRange(mask, np.array(color), np.array(color))

            # Smoothing and denoising: apply morphological operations
            kernel = np.ones((3, 3), np.uint8)
            color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_OPEN, kernel, iterations=1)
            color_mask = cv2.morphologyEx(color_mask, cv2.MORPH_CLOSE, kernel, iterations=1)

            # Find contours for this color
            contours, _ = cv2.findContours(color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

            if len(contours) > 0:
                print(f"Found {len(contours)} contours for color {color}")

                # Process each contour as an instance
                for contour in contours:
                    area = cv2.contourArea(contour)
                    perimeter = cv2.arcLength(contour, True)
                    # Minimum area/perimeter filtering
                    if area < 50 or perimeter < 30:
                        continue  # Skip small/noisy contours

                    # Adaptive epsilon: smaller for large/complex contours
                    if area > 1000:
                        epsilon = 0.005 * perimeter
                    elif area > 200:
                        epsilon = 0.01 * perimeter
                    else:
                        epsilon = 0.02 * perimeter
                    approx = cv2.approxPolyDP(contour, epsilon, True)

                    # Convert contour points to list format
                    coordinates = approx.reshape(-1, 2).tolist()

                    # Only add if we have enough points to form a polygon
                    if len(coordinates) >= 3:
                        bbox = compute_bbox(coordinates)

                        # Find best match in meta by combined score
                        best_match = find_best_match(bbox, meta_instances, used_meta)

                        if best_match and best_match[2] > 0.3:  # Minimum score threshold
                            used_meta.add(best_match[0])
                            meta_inst = best_match[1]
                            instanceId = meta_inst.get('instanceId', f'Object-{len(used_meta)}')
                            name = meta_inst.get('name', 'Object')
                            class_name = meta_inst.get('className', default_class_name)
                            print(f"  Matched instance {instanceId} with score {best_match[2]:.3f}")
                        else:
                            # No good match found, create new instance
                            instanceId = f'Object-{len(used_meta)+1}'
                            name = 'Object'
                            class_name = default_class_name
                            print(f"  Created new instance {instanceId} (no good match found)")

                        # Group by class name
                        if class_name not in class_groups:
                            class_groups[class_name] = []

                        instance = {
                            'instanceId': instanceId,
                            'name': name,
                            'coordinates': coordinates
                        }
                        class_groups[class_name].append(instance)

        # Convert class groups to final JSON structure
        for class_name, instances in class_groups.items():
            if instances:  # Only add classes with instances
                class_data = {
                    'className': class_name,
                    'instances': instances
                }
                json_data['classes'].append(class_data)

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

        # Save the JSON file
        output_path = os.path.join(output_dir, mask_name.replace('.png', '.json'))
        with open(output_path, 'w') as f:
            json.dump(json_data, f, indent=2)
        
        print(f"Created JSON: {output_path}")
        print(f"Total classes: {len(json_data['classes'])}")
        for cls in json_data['classes']:
            print(f"  Class {cls['className']}: {len(cls['instances'])} instances")

    except Exception as e:
        print(f"Error processing {mask_path}: {str(e)}")
        raise

if __name__ == "__main__":
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Convert mask images back to JSON annotations')
    parser.add_argument('--file', help='Specific mask file to process')
    parser.add_argument('--meta', help='Path to meta JSON file', default=None)
    args = parser.parse_args()

    # Define directories using relative paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    mask_dir = os.path.abspath(os.path.join(script_dir, '../Annotations'))
    json_dir = os.path.abspath(os.path.join(script_dir, '../json'))
    meta_path = args.meta

    print(f"Mask directory: {mask_dir}")
    print(f"JSON output directory: {json_dir}")
    if meta_path:
        print(f"Meta JSON path: {meta_path}")

    try:
        if args.file:
            # Process specific file
            mask_file = os.path.join(mask_dir, args.file)
            if not os.path.exists(mask_file):
                raise FileNotFoundError(f"Mask file not found: {mask_file}")
            print(f"\nProcessing specific file: {args.file}")
            mask_to_json(mask_file, json_dir, meta_path)
        else:
            # Process all mask files
            mask_files = glob.glob(os.path.join(mask_dir, "*.png"))
            mask_files = [f for f in mask_files if not f.endswith('.gitkeep')]  # Exclude .gitkeep
            
            if not mask_files:
                print("No mask files found to process")
            else:
                for mask_file in sorted(mask_files):
                    try:
                        print(f"\nProcessing {os.path.basename(mask_file)}...")
                        mask_to_json(mask_file, json_dir, meta_path)
                    except Exception as e:
                        print(f"Failed to process {mask_file}: {str(e)}")
    except Exception as e:
        print(f"Error: {str(e)}")
        exit(1)