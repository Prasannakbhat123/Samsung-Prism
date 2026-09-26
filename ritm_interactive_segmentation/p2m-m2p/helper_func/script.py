import numpy as np
import cv2
import json
import matplotlib.pyplot as plt
import argparse
import random

# (alpha channel)
DEFAULT_ALPHA = 128  # (0-255)

class_colors = {
    "rectangle": (255, 0, 0, DEFAULT_ALPHA),      # Red 
    "triangle": (0, 255, 0, DEFAULT_ALPHA),         # Green
    "circle": (0, 0, 255, DEFAULT_ALPHA),           # Blue
    "polygon": (255, 255, 0, DEFAULT_ALPHA),        # Yellow 
    "ellipse": (255, 0, 255, DEFAULT_ALPHA),        # Magenta 
    "line": (0, 255, 255, DEFAULT_ALPHA),           # Cyan 
    "default": (128, 128, 128, DEFAULT_ALPHA)       # Gray for unknown 
}

def get_color_for_class(label):
    return class_colors.get(label, class_colors["default"])

def points_to_mask(json_file, output_file, image_size=(512, 512)):

    mask = np.zeros((image_size[1], image_size[0], 4), dtype=np.uint8)
    
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    for shape in data.get("shapes", []):
        label = shape.get("label", "default")
        color = get_color_for_class(label)
        points = shape.get("points", [])
        if not points:
            continue
        points = np.array(points, dtype=np.int32)
        cv2.fillPoly(mask, [points], color)
    
    cv2.imwrite(output_file, mask)
    print(f"Mask saved to {output_file}")
    
    plt.figure(figsize=(10, 10))
    plt.imshow(cv2.cvtColor(mask, cv2.COLOR_BGRA2RGBA))
    plt.title("Generated Segmentation Mask")
    plt.show()
    
    return mask

def mask_to_points(mask_file, output_json, point_density_factor=0.01, 
                   min_points=10, max_points=100, by_area=True):

    mask = cv2.imread(mask_file, cv2.IMREAD_UNCHANGED)
    if mask is None:
        raise ValueError(f"Could not read mask file: {mask_file}")
    
    if mask.shape[2] == 4:
        mask_gray = cv2.cvtColor(mask, cv2.COLOR_BGRA2GRAY)
    else:
        mask_gray = cv2.cvtColor(mask, cv2.COLOR_BGR2GRAY)
    
    contours, _ = cv2.findContours(mask_gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    
    result = {"shapes": []}
    
    for i, contour in enumerate(contours):
        sample_point = tuple(contour[0][0])
        if 0 <= sample_point[1] < mask.shape[0] and 0 <= sample_point[0] < mask.shape[1]:
            if mask.shape[2] == 4:
                color = tuple(mask[sample_point[1], sample_point[0]])
            else:
                color = tuple(mask[sample_point[1], sample_point[0]]) + (DEFAULT_ALPHA,)
        else:
            color = class_colors["default"]
        
        label = "default"
        for class_name, class_color in class_colors.items():
            if np.array_equal(np.array(color), np.array(class_color)):
                label = class_name
                break
        
        if by_area:
            area = cv2.contourArea(contour)
            num_points = int(np.sqrt(area) * point_density_factor)
        else:
            perimeter = cv2.arcLength(contour, True)
            num_points = int(perimeter * point_density_factor)
        
        num_points = max(min(num_points, max_points), min_points)
        
        epsilon = 0.01 * cv2.arcLength(contour, True)
        approx_contour = cv2.approxPolyDP(contour, epsilon, True)
        
        while len(approx_contour) > num_points and epsilon < 1.0:
            epsilon *= 1.2
            approx_contour = cv2.approxPolyDP(contour, epsilon, True)
        
        if len(approx_contour) < num_points and len(contour) > num_points:
            step = len(contour) // num_points
            indices = [j * step for j in range(num_points)]
            approx_contour = contour[indices]
        
        points = [tuple(map(int, point[0])) for point in approx_contour]
        
        shape_data = {
            "label": label,
            "group_id": i + 1,
            "points": points
        }
        result["shapes"].append(shape_data)
    
    with open(output_json, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"Point annotations saved to {output_json}")
    
    visualize_points(result, (mask.shape[0], mask.shape[1]))
    
    return result

def visualize_points(annotation_data, image_size):
    vis_img = np.zeros((image_size[0], image_size[1], 4), dtype=np.uint8)
    
    for shape in annotation_data.get("shapes", []):
        label = shape.get("label", "default")
        color = get_color_for_class(label)
        points = shape.get("points", [])
        if not points:
            continue
        points_arr = np.array(points, dtype=np.int32)
        cv2.polylines(vis_img, [points_arr], True, color, 2)
        for point in points:
            cv2.circle(vis_img, tuple(point), 3, (255, 255, 255, 255), -1)
    
    plt.figure(figsize=(10, 10))
    plt.imshow(cv2.cvtColor(vis_img, cv2.COLOR_BGRA2RGBA))
    plt.title("Point-Based Annotation Visualization")
    plt.show()

def create_sample_json(output_file, image_size=(512, 512)):
    rect_points = [(100, 100), (300, 100), (300, 200), (100, 200)]
    
    tri_points = [(200, 300), (350, 350), (150, 400)]
    
    poly_points = []
    center = (400, 150)
    radius = 50
    num_points = 8
    for i in range(num_points):
        angle = 2 * np.pi * i / num_points
        x = int(center[0] + radius * np.cos(angle))
        y = int(center[1] + radius * np.sin(angle))
        poly_points.append((x, y))
    
    data = {
        "shapes": [
            {"label": "rectangle", "group_id": 1, "points": rect_points},
            {"label": "triangle", "group_id": 2, "points": tri_points},
            {"label": "polygon", "group_id": 3, "points": poly_points}
        ]
    }
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Sample JSON saved to {output_file}")
    return data

def main():
    parser = argparse.ArgumentParser(description="Convert between point-based annotations and segmentation masks")
    subparsers = parser.add_subparsers(dest="mode", help="Operation mode")
    
    # Parser for points-to-mask mode
    p2m_parser = subparsers.add_parser("p2m", help="Convert points to mask")
    p2m_parser.add_argument("--json", required=True, help="Input JSON file with point annotations")
    p2m_parser.add_argument("--output", required=True, help="Output mask image file")
    p2m_parser.add_argument("--width", type=int, default=512, help="Width of output mask")
    p2m_parser.add_argument("--height", type=int, default=512, help="Height of output mask")
    
    # Parser for mask-to-points mode
    m2p_parser = subparsers.add_parser("m2p", help="Convert mask to points")
    m2p_parser.add_argument("--mask", required=True, help="Input mask image file")
    m2p_parser.add_argument("--output", required=True, help="Output JSON file")
    m2p_parser.add_argument("--density", type=float, default=0.01, help="Point density factor (higher = more points)")
    m2p_parser.add_argument("--min-points", type=int, default=10, help="Minimum number of points per shape")
    m2p_parser.add_argument("--max-points", type=int, default=100, help="Maximum number of points per shape")
    m2p_parser.add_argument("--by-area", action="store_true", default=True,
                            help="Calculate points based on area (otherwise perimeter)")
    
    # Parser for creating a sample JSON
    sample_parser = subparsers.add_parser("sample", help="Create a sample JSON annotation file")
    sample_parser.add_argument("--output", required=True, help="Output JSON file")
    
    args = parser.parse_args()
    
    if args.mode == "p2m":
        points_to_mask(args.json, args.output, (args.width, args.height))
    elif args.mode == "m2p":
        mask_to_points(args.mask, args.output, args.density, args.min_points, args.max_points, args.by_area)
    elif args.mode == "sample":
        create_sample_json(args.output)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
