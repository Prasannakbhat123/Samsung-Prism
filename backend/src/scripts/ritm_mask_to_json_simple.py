#!/usr/bin/env python3

import os
import cv2
import numpy as np
import json

def ritm_mask_to_json(mask_path, output_dir):
    mask = cv2.imread(mask_path, cv2.IMREAD_UNCHANGED)
    if mask is None:
        print(f'Could not read mask: {mask_path}')
        return

    mask_name = os.path.basename(mask_path)
    image_name = mask_name.replace('.png', '.jpg')

    # Find all unique values except 0 (background)
    unique_values = [v for v in np.unique(mask) if v != 0]
    if not unique_values:
        print(f'No objects found in mask: {mask_path}')
        return

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

def main():
    mask_dir = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/mask-ritm'
    json_dir = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/jsons'
    mask_files = [f for f in os.listdir(mask_dir) if f.endswith('.png')]
    if not mask_files:
        print('No mask files found in mask-ritm directory.')
        return
    for mask_file in mask_files:
        mask_path = os.path.join(mask_dir, mask_file)
        print(f'Converting {mask_file} to JSON...')
        try:
            ritm_mask_to_json(mask_path, json_dir)
        except Exception as e:
            print(f'Failed to convert {mask_file}: {e}')

if __name__ == '__main__':
    main() 