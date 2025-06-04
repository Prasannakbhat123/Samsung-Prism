#!/usr/bin/env python3

import json
import os
import numpy as np
import cv2
from PIL import Image
import glob
import argparse

def mask_to_json(mask_path, output_dir):
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
        }

        # Process each color/class
        for color, class_name in colors.items():
            # Create binary mask for this color
            color_mask = cv2.inRange(mask, np.array(color), np.array(color))
            
            # Find contours for this color
            contours, _ = cv2.findContours(color_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if len(contours) > 0:
                class_data = {
                    'className': class_name,
                    'instances': []
                }

                # Process each contour as an instance
                for contour in contours:
                    # Simplify the contour to reduce number of points
                    epsilon = 0.005 * cv2.arcLength(contour, True)
                    approx = cv2.approxPolyDP(contour, epsilon, True)
                    
                    # Convert contour points to list format
                    coordinates = approx.reshape(-1, 2).tolist()
                    
                    # Only add if we have enough points to form a polygon
                    if len(coordinates) >= 3:
                        instance = {
                            'coordinates': coordinates
                        }
                        class_data['instances'].append(instance)

                # Only add class if it has instances
                if class_data['instances']:
                    json_data['classes'].append(class_data)

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

        # Save the JSON file
        output_path = os.path.join(output_dir, mask_name.replace('.png', '.json'))
        with open(output_path, 'w') as f:
            json.dump(json_data, f, indent=2)
        print(f"Created JSON: {output_path}")

    except Exception as e:
        print(f"Error processing {mask_path}: {str(e)}")
        raise

if __name__ == "__main__":
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Convert mask images back to JSON annotations')
    parser.add_argument('--file', help='Specific mask file to process')
    args = parser.parse_args()

    # Define directories using absolute paths
    mask_dir = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/Annotations'
    json_dir = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/json'

    print(f"Mask directory: {mask_dir}")
    print(f"JSON output directory: {json_dir}")

    try:
        if args.file:
            # Process specific file
            mask_file = os.path.join(mask_dir, args.file)
            if not os.path.exists(mask_file):
                raise FileNotFoundError(f"Mask file not found: {mask_file}")
            print(f"\nProcessing specific file: {args.file}")
            mask_to_json(mask_file, json_dir)
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
                        mask_to_json(mask_file, json_dir)
                    except Exception as e:
                        print(f"Failed to process {mask_file}: {str(e)}")
    except Exception as e:
        print(f"Error: {str(e)}")
        exit(1) 