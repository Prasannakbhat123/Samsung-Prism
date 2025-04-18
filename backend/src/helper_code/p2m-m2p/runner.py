from script import points_to_mask, mask_to_points

import cv2

# Example usage
if __name__ == "__main__":
    # Example image dimensions
    img_height, img_width = 480, 640
    
    # Example shapes (polygon points) with custom class names
    example_shapes = [
        {
            "label": "dog",
            "group_id": 1,
            "points": [[100, 100], [300, 100], [300, 200], [100, 200]]
        },
        {
            "label": "cat",
            "group_id": 2,
            "points": [[400, 300], [500, 200], [600, 300]]
        }
    ]
    
    # Create a custom color map for your classes
    custom_colors = {
        "dog": (0, 0, 255),       # Red in BGR 
        "cat": (0, 255, 0),       # Green in BGR
        "person": (255, 0, 0),    # Blue in BGR
        "car": (255, 255, 0),     # Yellow in BGR
        "default": (128, 128, 128) # Gray in BGR
    }
    
    # Using the custom colors
    mask = points_to_mask(example_shapes, (img_height, img_width), custom_colors)
    
    # Convert mask back to points
    shapes = mask_to_points(mask, class_colors=custom_colors)
    
    print(f"Original shapes: {len(example_shapes)}")
    print(f"Original class names: {[shape['label'] for shape in example_shapes]}")
    print(f"Recovered shapes: {len(shapes)}")
    print(f"Recovered class names: {[shape['label'] for shape in shapes]}")
    
    