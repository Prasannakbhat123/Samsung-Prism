#!/usr/bin/env python3

import os
import cv2
import numpy as np
import json
import argparse

def ritm_mask_to_json(mask_path, output_dir):
    """Convert RITM grayscale mask to JSON format"""
    mask = cv2.imread(mask_path, cv2.IMREAD_UNCHANGED)
    if mask is None:
        print(f'Could not read mask: {mask_path}')
        return

    mask_name = os.path.basename(mask_path)
    image_name = mask_name.replace('.png', '.jpg')

    print(f'Processing RITM mask: {mask_name}')

    # Find all unique values except 0 (background)
    unique_values = [v for v in np.unique(mask) if v != 0]
    if not unique_values:
        print(f'No objects found in mask: {mask_path}')
        return

    print(f'Found {len(unique_values)} unique values: {unique_values}')

    json_data = {
        'imageName': image_name,
        'classes': []
    }

    for idx, value in enumerate(unique_values, 1):
        # Binary mask for this value
        binary_mask = (mask == value).astype(np.uint8)
        contours, _ = cv2.findContours(binary_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            continue
            
        print(f'  Class {idx}: Found {len(contours)} contours')
        
        class_data = {
            'className': str(idx),  # Sequential class names for compatibility
            'instances': []
        }
        
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
                class_data['instances'].append(instance)
        
        if class_data['instances']:
            json_data['classes'].append(class_data)

    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, mask_name.replace('.png', '.json'))
    with open(output_path, 'w') as f:
        json.dump(json_data, f, indent=2)
    
    print(f'Created JSON: {output_path}')
    print(f'Total classes: {len(json_data["classes"])}')
    for cls in json_data['classes']:
        print(f'  Class {cls["className"]}: {len(cls["instances"])} instances')

def main():
    parser = argparse.ArgumentParser(description='Convert RITM mask images to JSON annotations')
    parser.add_argument('--input-dir', help='Input directory for RITM masks',
                       default='/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/mask-ritm')
    parser.add_argument('--output-dir', help='Output directory for JSON files',
                       default='/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/json')
    parser.add_argument('--file', help='Specific mask file to process')
    args = parser.parse_args()

    print(f"RITM input directory: {args.input_dir}")
    print(f"JSON output directory: {args.output_dir}")

    if args.file:
        # Process specific file
        mask_path = os.path.join(args.input_dir, args.file)
        if not os.path.exists(mask_path):
            print(f'Mask file not found: {mask_path}')
            return
        print(f'Converting {args.file} to JSON...')
        try:
            ritm_mask_to_json(mask_path, args.output_dir)
        except Exception as e:
            print(f'Failed to convert {args.file}: {e}')
    else:
        # Process all mask files
        mask_files = [f for f in os.listdir(args.input_dir) if f.endswith('.png')]
        if not mask_files:
            print('No mask files found in RITM directory.')
            return
        
        for mask_file in mask_files:
            mask_path = os.path.join(args.input_dir, mask_file)
            print(f'Converting {mask_file} to JSON...')
            try:
                ritm_mask_to_json(mask_path, args.output_dir)
            except Exception as e:
                print(f'Failed to convert {mask_file}: {e}')

if __name__ == '__main__':
    main() 