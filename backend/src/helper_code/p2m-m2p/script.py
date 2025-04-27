import cv2
import numpy as np
import random

def points_to_mask(shapes, image_shape, class_colors=None):
    """
    Convert point annotations to a segmentation mask.
    
    Args:
        shapes (list): List of shape dictionaries, each containing:
            - label (str): The class label (can be any string like "dog", "cat", "person", etc.)
            - points (list): List of [x, y] coordinates
        image_shape (tuple): (height, width) of the target mask
        class_colors (dict, optional): Dictionary mapping class labels to BGR colors
            
    Returns:
        numpy.ndarray: The segmentation mask as a BGR image
    """
    if not shapes:
        return None
    
    if class_colors is None:
        class_colors = {"default": (128, 128, 128)}  # Gray in BGR for default/unknown classes
        
        for shape in shapes:
            label = shape.get("label", "default")
            if label not in class_colors:
                # Generate a random color (BGR format)
                class_colors[label] = (
                    random.randint(0, 255),
                    random.randint(0, 255), 
                    random.randint(0, 255)
                )
    
    h, w = image_shape[:2]
    mask = np.zeros((h, w, 3), dtype=np.uint8)
    
    for shape in shapes:
        label = shape.get("label", "default")
        points = shape.get("points", [])
        
        if label not in class_colors:
            class_colors[label] = (
                random.randint(0, 255),
                random.randint(0, 255), 
                random.randint(0, 255)
            )
            
        color = class_colors[label]
        
        if not points:
            continue
        
        points = np.array(points, dtype=np.int32)
        points = points.reshape((-1, 1, 2))
        
        cv2.fillPoly(mask, [points], color)
    
    return mask

def mask_to_points(mask, point_density=0.01, min_points=10, max_points=100, class_colors=None):
    """
    Convert a segmentation mask back to point annotations.
    
    Args:
        mask (numpy.ndarray): BGR segmentation mask
        point_density (float): Density factor for point generation
        min_points (int): Minimum number of points per shape
        max_points (int): Maximum number of points per shape
        class_colors (dict, optional): Dictionary mapping class labels to BGR colors.
            Should contain mappings for all your custom classes (e.g., "dog", "cat")
            
    Returns:
        list: List of shape dictionaries, each containing:
            - label (str): The class label
            - group_id (int): Shape identifier
            - points (list): List of [x, y] coordinates
    """
    if mask is None:
        return []
    
    if class_colors is None:
        class_colors = {"default": (128, 128, 128)}
    
    mask_gray = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
    
    contours, _ = cv2.findContours(mask_gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    
    all_shapes = []
    for i, contour in enumerate(contours):
        if len(contour) < 3:
            continue
            
        # Sample a point to get the color
        sample_point = tuple(contour[0][0])
        if (0 <= sample_point[1] < mask.shape[0] and 
            0 <= sample_point[0] < mask.shape[1]):
            color = tuple(mask[sample_point[1], sample_point[0]])
        else:
            color = class_colors["default"]
        
        # Find the matching label based on color
        label = "default"
        closest_color_diff = float('inf')
        
        for class_name, class_color in class_colors.items():
            # Calculate color difference (simple Euclidean distance in BGR space) --- > for convex contours, might have to be optimized..?
            # diff = sum((c1 - c2)**2 for c1, c2 in zip(color, class_color)) # overflow error 
            diff = sum(int((int(c1) - int(c2))**2) for c1, c2 in zip(color, class_color))
            if diff < closest_color_diff:
                closest_color_diff = diff
                label = class_name
        
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        num_points = int(np.sqrt(area) * point_density)
        num_points = max(min(num_points, max_points), min_points)
        
        epsilon = 0.01 * perimeter
        approx_contour = cv2.approxPolyDP(contour, epsilon, True)
        
        # Adjust epsilon to get close to the desired number of points
        while len(approx_contour) > num_points and epsilon < 1.0:
            epsilon *= 1.2
            approx_contour = cv2.approxPolyDP(contour, epsilon, True)
        
        # If we have too few points, use more points from the original contour
        if len(approx_contour) < num_points and len(contour) > num_points:
            step = len(contour) // num_points
            indices = [i * step for i in range(num_points)]
            approx_contour = contour[indices]
        
        points = [list(map(int, point[0])) for point in approx_contour]
        
        all_shapes.append({
            "label": label,
            "group_id": i + 1,
            "points": points
        })
    
    return all_shapes

