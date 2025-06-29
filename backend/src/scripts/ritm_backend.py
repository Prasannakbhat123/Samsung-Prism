#!/usr/bin/env python3

import sys
import os
import json
import argparse
import cv2
import numpy as np
import base64
import io
from PIL import Image

# Add RITM paths
sys.path.append('/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/ritm_interactive_segmentation')
sys.path.append('/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/ritm_interactive_segmentation/interactive_demo')
sys.path.append('/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/ritm_interactive_segmentation/web_demo')

from interactive_demo.controller import InteractiveController
from model_loader import load_model_from_config, get_model_config

# Global variables for RITM state
current_controller = None
current_image = None
current_filename = None

# Load model at startup
print("Loading RITM model...", file=sys.stderr)
model_config = get_model_config()
model = load_model_from_config(model_config)
print(f"RITM model loaded: {type(model)}", file=sys.stderr)

def load_image_by_name(filename):
    """Load an image by filename from JPEGImages directory"""
    global current_controller, current_image, current_filename
    
    # Path to JPEGImages directory
    jpeg_dir = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/JPEGImages'
    image_path = os.path.join(jpeg_dir, filename)
    
    if not os.path.exists(image_path):
        return {'success': False, 'error': f'Image not found: {image_path}'}
    
    try:
        image = cv2.imread(image_path)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        current_filename = os.path.splitext(filename)[0]
        current_image = image
        
        # Initialize controller
        current_controller = InteractiveController(
            net=model,
            device=model_config.get('device', 'cpu'),
            predictor_params={'brs_mode': 'NoBRS'},
            update_image_callback=lambda reset_canvas=False: None,
            prob_thresh=0.5
        )
        current_controller.set_image(image)
        
        # Convert image to base64 for display
        pil_image = Image.fromarray(image)
        buffer = io.BytesIO()
        pil_image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return {
            'success': True,
            'image': img_str,
            'width': image.shape[1],
            'height': image.shape[0]
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

def add_click(x, y, is_positive=True, filename=None):
    """Add a click to the current RITM session"""
    global current_controller, current_image, current_filename
    
    # If no controller exists or filename changed, reload the image
    if current_controller is None or (filename and filename != current_filename):
        if filename:
            print(f"Reloading image: {filename}", file=sys.stderr)
            load_result = load_image_by_name(filename)
            if not load_result['success']:
                return {'success': False, 'error': f'Failed to load image: {load_result["error"]}'}
        else:
            return {'success': False, 'error': 'No image loaded and no filename provided'}
    
    try:
        current_controller.add_click(x, y, is_positive)
        
        # Get the visualization
        vis_image = current_controller.get_visualization(alpha_blend=0.5, click_radius=3)
        
        if vis_image is not None:
            # Convert to base64
            pil_image = Image.fromarray(vis_image)
            buffer = io.BytesIO()
            pil_image.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            # Save the current mask after each click
            mask = current_controller.result_mask
            if mask is not None and current_filename:
                mask_to_save = mask.copy()
                if mask_to_save.max() < 256:
                    mask_to_save = mask_to_save.astype(np.uint8)
                    mask_to_save *= 255 // mask_to_save.max() if mask_to_save.max() > 0 else 255
                
                # Save under mask-ritm/<imagename>.png
                mask_dir = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/mask-ritm'
                if not os.path.exists(mask_dir):
                    os.makedirs(mask_dir)
                
                save_path = os.path.join(mask_dir, f'{current_filename}.png')
                cv2.imwrite(save_path, mask_to_save)
                
                # Convert the new mask to JSON
                try:
                    import subprocess
                    script_path = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/scripts/ritm_mask_to_json_simple.py'
                    result = subprocess.run(['python3', script_path, '--file', f'{current_filename}.png'], 
                                          capture_output=True, text=True, cwd='/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/scripts')
                    if result.returncode == 0:
                        print(f"Successfully converted {current_filename}.png to JSON", file=sys.stderr)
                    else:
                        print(f"Failed to convert to JSON: {result.stderr}", file=sys.stderr)
                except Exception as e:
                    print(f"Error converting mask to JSON: {e}", file=sys.stderr)
            
            return {
                'success': True,
                'image': img_str,
                'clicks_count': len(current_controller.clicker.clicks_list)
            }
        else:
            return {'success': False, 'error': 'Failed to generate visualization'}
            
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_model_info():
    """Get information about the loaded model"""
    return {
        'model_type': model_config.get('model_type', 'unknown'),
        'device': model_config.get('device', 'cpu'),
        'supports_prev_mask': getattr(model, 'with_prev_mask', False),
        'model_class': type(model).__name__
    }

def main():
    parser = argparse.ArgumentParser(description='RITM Backend CLI')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Load image command
    load_parser = subparsers.add_parser('load_image', help='Load image by filename')
    load_parser.add_argument('--filename', required=True, help='Image filename')
    
    # Add click command
    click_parser = subparsers.add_parser('add_click', help='Add click to current session')
    click_parser.add_argument('--filename', required=True, help='Current image filename')
    click_parser.add_argument('--x', type=float, required=True, help='X coordinate')
    click_parser.add_argument('--y', type=float, required=True, help='Y coordinate')
    click_parser.add_argument('--positive', type=str, default='true', help='Is positive click')
    
    # Model info command
    subparsers.add_parser('model_info', help='Get model information')
    
    args = parser.parse_args()
    
    if args.command == 'load_image':
        result = load_image_by_name(args.filename)
        print(json.dumps(result))
    
    elif args.command == 'add_click':
        is_positive = args.positive.lower() == 'true'
        result = add_click(args.x, args.y, is_positive, args.filename)
        print(json.dumps(result))
    
    elif args.command == 'model_info':
        result = get_model_info()
        print(json.dumps(result))
    
    else:
        parser.print_help()

if __name__ == '__main__':
    main() 