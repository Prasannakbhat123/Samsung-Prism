import os
import cv2
import numpy as np
import json

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

def mask_to_json(mask_path, output_dir=None):
    """
    Convert a single-channel or multi-object mask to JSON with polygons for each object.
    Each unique value (except 0) is treated as a separate object/class.
    Supports both RGB and grayscale masks with consistent color mapping.
    """
    # Read the mask (should be single-channel or 3-channel with identical values)
    mask = cv2.imread(mask_path, cv2.IMREAD_UNCHANGED)
    if mask is None:
        raise ValueError(f"Could not read mask file: {mask_path}")

    mask_name = os.path.basename(mask_path)
    image_name = mask_name.replace('.png', '.jpg')

    json_data = {
        'imageName': image_name,
        'classes': []
    }

    # Detect mask type
    mask_type = detect_mask_type(mask)
    
    if mask_type == 'rgb':
        # Define colors for different classes (BGR format) - same as backend scripts
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
        
        class_groups = process_rgb_mask(mask, colors)
    else:
        # Process grayscale mask (original logic)
        class_groups = process_grayscale_mask(mask)

    # Convert class groups to final JSON structure
    for class_name, instances in class_groups.items():
        if instances:  # Only add classes with instances
            class_data = {
                'className': class_name,
                'instances': instances
            }
            json_data['classes'].append(class_data)

    # Write JSON
    if output_dir is None:
        output_dir = os.path.dirname(mask_path)
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, mask_name.replace('.png', '.json'))
    with open(output_path, 'w') as f:
        json.dump(json_data, f, indent=2)
    print(f"Created JSON: {output_path}")
    print(f"Total classes: {len(json_data['classes'])}")
    for cls in json_data['classes']:
        print(f"  Class {cls['className']}: {len(cls['instances'])} instances")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python mask_to_json.py <mask_path> [output_dir]")
        exit(1)
    mask_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    mask_to_json(mask_path, output_dir) 