#!/usr/bin/env python3

import json
import os
import numpy as np
import cv2
from PIL import Image
import glob

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
        
        # Construct the exact image path
        image_path = os.path.join('/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/temp', 
                                image_name, image_name)
            
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
    # Define directories using absolute paths
    json_dir = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/json'
    output_dir = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/Annotations'

    print(f"JSON directory: {json_dir}")
    print(f"Output directory: {output_dir}")

    # Process specific JSON file
    json_file = os.path.join(json_dir, "frame_000001.json")
    try:
        print(f"\nProcessing {os.path.basename(json_file)}...")
        create_mask_from_polygons(json_file, output_dir)
    except Exception as e:
        print(f"Failed to process {json_file}: {str(e)}") 