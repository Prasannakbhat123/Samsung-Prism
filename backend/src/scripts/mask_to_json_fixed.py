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

def detect_mask_type(mask):
    """Detect if mask is RGB (colored) or grayscale"""
    if len(mask.shape) == 3:
        # RGB image
        unique_values = np.unique(mask.reshape(-1, mask.shape[-1]), axis=0)
        print(f"RGB mask detected with {len(unique_values)} unique colors")
        return 'rgb'
    else:
        # Grayscale image
        unique_values = np.unique(mask)
        print(f"Grayscale mask detected with values: {unique_values}")
        return 'grayscale'

def process_rgb_mask(mask, colors):
    """Process RGB mask with specific colors"""
    class_groups = {}
    
    for color, default_class_name in colors.items():
        # Create binary mask for this color
        color_mask = cv2.inRange(mask, np.array(color), np.array(color))
        
        # Find contours for this color
        contours, _ = cv2.findContours(color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if len(contours) > 0:
            print(f"Found {len(contours)} contours for color {color}")
            
            # Process each contour as an instance
            for contour in contours:
                # Simplify the contour to reduce number of points
                epsilon = 0.005 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                
                # Convert contour points to list format
                coordinates = approx.reshape(-1, 2).tolist()
                
                # Only add if we have enough points to form a polygon
                if len(coordinates) >= 3:
                    instanceId = f'Object-{len(class_groups.get(default_class_name, []))+1}'
                    name = 'Object'
                    class_name = default_class_name
                    
                    # Group by class name
                    if class_name not in class_groups:
                        class_groups[class_name] = []
                    
                    instance = {
                        'instanceId': instanceId,
                        'name': name,
                        'coordinates': coordinates
                    }
                    class_groups[class_name].append(instance)
    
    return class_groups

def process_grayscale_mask(mask):
    """Process grayscale mask with binary values"""
    class_groups = {}
    
    # Find all unique values except 0 (background)
    unique_values = [v for v in np.unique(mask) if v != 0]
    
    if not unique_values:
        print("No objects found in grayscale mask")
        return class_groups
    
    print(f"Found {len(unique_values)} unique values in grayscale mask: {unique_values}")
    
    for idx, value in enumerate(unique_values, 1):
        # Binary mask for this value
        binary_mask = (mask == value).astype(np.uint8)
        contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            continue
            
        class_name = str(idx)
        class_groups[class_name] = []
        
        for inst_idx, contour in enumerate(contours, 1):
            epsilon = 0.005 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            coordinates = approx.reshape(-1, 2).tolist()
            
            if len(coordinates) >= 3:
                instance = {
                    'instanceId': f'Object-{idx}-Instance-{inst_idx}',
                    'name': 'Object',
                    'coordinates': coordinates
                }
                class_groups[class_name].append(instance)
    
    return class_groups

def mask_to_json(mask_path, output_dir, meta_path=None):
    """
    Convert a mask image back to JSON format with polygon annotations.
    Handles both RGB (colored) and grayscale masks.
    """
    try:
        # Read the mask file
        mask = cv2.imread(mask_path, cv2.IMREAD_UNCHANGED)
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

        # Detect mask type
        mask_type = detect_mask_type(mask)
        
        if mask_type == 'rgb':
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
            
            # Load meta JSON for RGB masks
            meta = load_meta(meta_path) if meta_path else {}
            frame_key = os.path.splitext(mask_name)[0]
            meta_instances = meta.get(frame_key, [])
            used_meta = set()
            
            print(f"Found {len(meta_instances)} meta instances for {frame_key}")
            
            class_groups = process_rgb_mask(mask, colors)
            
            # Apply metadata matching for RGB masks
            if meta_instances:
                for class_name, instances in class_groups.items():
                    for instance in instances:
                        coordinates = instance['coordinates']
                        bbox = compute_bbox(coordinates)
                        best_match = find_best_match(bbox, meta_instances, used_meta)
                        
                        if best_match and best_match[2] > 0.3:
                            used_meta.add(best_match[0])
                            meta_inst = best_match[1]
                            instance['instanceId'] = meta_inst.get('instanceId', instance['instanceId'])
                            instance['name'] = meta_inst.get('name', instance['name'])
                            # Update class name if available in metadata
                            if 'className' in meta_inst:
                                new_class_name = meta_inst['className']
                                if new_class_name != class_name:
                                    if new_class_name not in class_groups:
                                        class_groups[new_class_name] = []
                                    class_groups[new_class_name].append(instance)
                                    class_groups[class_name].remove(instance)
                                    if not class_groups[class_name]:
                                        del class_groups[class_name]
                                    break
        else:
            # Process grayscale mask
            class_groups = process_grayscale_mask(mask)

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
    parser.add_argument('--input-dir', help='Input directory for masks', 
                       default='/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/Annotations')
    parser.add_argument('--output-dir', help='Output directory for JSON files',
                       default='/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/json')
    args = parser.parse_args()

    print(f"Input directory: {args.input_dir}")
    print(f"Output directory: {args.output_dir}")
    if args.meta:
        print(f"Meta JSON path: {args.meta}")

    try:
        if args.file:
            # Process specific file
            mask_file = os.path.join(args.input_dir, args.file)
            if not os.path.exists(mask_file):
                raise FileNotFoundError(f"Mask file not found: {mask_file}")
            print(f"\nProcessing specific file: {args.file}")
            mask_to_json(mask_file, args.output_dir, args.meta)
        else:
            # Process all mask files
            mask_files = glob.glob(os.path.join(args.input_dir, "*.png"))
            mask_files = [f for f in mask_files if not f.endswith('.gitkeep')]  # Exclude .gitkeep
            
            if not mask_files:
                print("No mask files found to process")
            else:
                for mask_file in sorted(mask_files):
                    try:
                        print(f"\nProcessing {os.path.basename(mask_file)}...")
                        mask_to_json(mask_file, args.output_dir, args.meta)
                    except Exception as e:
                        print(f"Failed to process {mask_file}: {str(e)}")
    except Exception as e:
        print(f"Error: {str(e)}")
        exit(1) 