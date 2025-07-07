#!/usr/bin/env python3

import json
import os
import numpy as np
import cv2
from PIL import Image
import glob
import argparse

def create_mask_from_polygons(json_path, output_dir):
    """
    Create a segmentation mask from polygon annotations in a JSON file.
    Each class will have a different color in the mask.
    """
    try:
        # Read the JSON file
        with open(json_path, 'r') as f:
            data = json.load(f)

        # Get image name
        image_name = data['imageName']
        if not image_name.endswith('.jpg'):
            image_name += '.jpg'
        
        # Construct the exact image path - now directly in JPEGImages
        script_dir = os.path.dirname(os.path.abspath(__file__))
        image_path = os.path.abspath(os.path.join(script_dir, '../JPEGImages', image_name))
            
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Could not find image file: {image_path}")
            
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image file: {image_path}")
            
        height, width = img.shape[:2]

        # Create an empty mask
        mask = np.zeros((height, width, 3), dtype=np.uint8)

        # Define colors for different classes (BGR format)
        colors = {
            "1": (0, 0, 255),    # Red
            "2": (255, 0, 0),    # Blue
            "3": (0, 255, 0),    # Green
            "4": (255, 255, 0),  # Cyan
            "5": (255, 0, 255),  # Magenta
            # Add more colors as needed
        }

        # Process each class
        for class_data in data['classes']:
            class_name = class_data['className']
            color = colors.get(class_name, (255, 255, 255))  # Default to white if class not in colors

            # Process each instance in the class
            for instance in class_data['instances']:
                # Convert coordinates to numpy array
                coordinates = np.array(instance['coordinates'], dtype=np.int32)
                
                # Fill the polygon with the class color
                cv2.fillPoly(mask, [coordinates], color)

        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)

        # Save the mask
        output_path = os.path.join(output_dir, f"{image_name.replace('.jpg', '.png')}")
        cv2.imwrite(output_path, mask)
        print(f"Created mask: {output_path}")
        
    except Exception as e:
        print(f"Error processing {json_path}: {str(e)}")
        raise

if __name__ == "__main__":
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Create masks from JSON annotations')
    parser.add_argument('--file', help='Specific JSON file to process')
    args = parser.parse_args()

    # Define directories using absolute paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    json_dir = os.path.abspath(os.path.join(script_dir, '../json'))
    output_dir = os.path.abspath(os.path.join(script_dir, '../Annotations'))

    print(f"JSON directory: {json_dir}")
    print(f"Output directory: {output_dir}")

    try:
        if args.file:
            # Process specific file
            json_file = os.path.join(json_dir, args.file)
            if not os.path.exists(json_file):
                raise FileNotFoundError(f"JSON file not found: {json_file}")
            print(f"\nProcessing specific file: {args.file}")
            create_mask_from_polygons(json_file, output_dir)
        else:
            # Process all JSON files
            json_files = glob.glob(os.path.join(json_dir, "*.json"))
            json_files = [f for f in json_files if not f.endswith('.gitkeep')]  # Exclude .gitkeep
            
            if not json_files:
                print("No JSON files found to process")
            else:
                for json_file in sorted(json_files):
                    try:
                        print(f"\nProcessing {os.path.basename(json_file)}...")
                        create_mask_from_polygons(json_file, output_dir)
                    except Exception as e:
                        print(f"Failed to process {json_file}: {str(e)}")
    except Exception as e:
        print(f"Error: {str(e)}")
        exit(1) 