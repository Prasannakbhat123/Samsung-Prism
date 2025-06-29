import os
import cv2
import numpy as np
import json

def mask_to_json(mask_path, output_dir=None):
    """
    Convert a single-channel or multi-object mask to JSON with polygons for each object.
    Each unique value (except 0) is treated as a separate object/class.
    """
    # Read the mask (should be single-channel or 3-channel with identical values)
    mask = cv2.imread(mask_path, cv2.IMREAD_UNCHANGED)
    if mask is None:
        raise ValueError(f"Could not read mask file: {mask_path}")

    # If mask is 3-channel, convert to single-channel
    if len(mask.shape) == 3:
        mask = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)

    mask_name = os.path.basename(mask_path)
    image_name = mask_name.replace('.png', '.jpg')

    json_data = {
        'imageName': image_name,
        'classes': []
    }

    # Find all unique object values (ignore 0 for background)
    object_values = [v for v in np.unique(mask) if v != 0]

    for idx, obj_val in enumerate(object_values, 1):
        # Create binary mask for this object
        obj_mask = (mask == obj_val).astype(np.uint8) * 255
        # Find contours
        contours, _ = cv2.findContours(obj_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        instances = []
        for inst_idx, contour in enumerate(contours, 1):
            if len(contour) < 3:
                continue  # Need at least 3 points for a polygon
            epsilon = 0.005 * cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, epsilon, True)
            coordinates = approx.reshape(-1, 2).tolist()
            if len(coordinates) < 3:
                continue
            instance = {
                'instanceId': f'Object-{idx}-Instance-{inst_idx}',
                'name': f'Object {idx}',
                'coordinates': coordinates
            }
            instances.append(instance)
        if instances:
            class_data = {
                'className': f'Object {idx}',
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

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python mask_to_json.py <mask_path> [output_dir]")
        exit(1)
    mask_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else None
    mask_to_json(mask_path, output_dir) 