import sys
import os
import json
import base64
import io
import tempfile
import cv2
import numpy as np
from PIL import Image
import traceback
import contextlib

# Add RITM paths - use absolute paths to ensure they're found
ritm_root = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/ritm_interactive_segmentation'
web_demo_path = os.path.join(ritm_root, 'web_demo')
interactive_demo_path = os.path.join(ritm_root, 'interactive_demo')

# Add both paths to Python path
sys.path.insert(0, web_demo_path)
sys.path.insert(0, interactive_demo_path)
sys.path.insert(0, ritm_root)

try:
    from model_loader import load_model_from_config, get_model_config
    from interactive_demo.controller import InteractiveController
    from isegm.inference import clicker
except ImportError as e:
    print(json.dumps({'error': f'Import error: {e}', 'paths': sys.path}))
    sys.exit(1)

# Session state file (JSON-based, persists between processes)
session_file = os.path.join(tempfile.gettempdir(), 'ritm_node_session.json')

def save_session_state(controller, image, filename):
    """Save session state to JSON file"""
    try:
        # Convert image to base64 for storage
        img_str = to_base64_img(image) if image is not None else None
        
        # Get controller state (clicks, masks, etc.)
        controller_state = {
            'clicks_list': [(click.coords, click.is_positive) for click in controller.clicker.clicks_list] if controller else [],
            'object_count': controller.object_count if controller else 0,
            'result_mask': controller.result_mask.tolist() if controller and controller.result_mask is not None else None,
            'probs_history': [(p1.tolist() if p1 is not None else None, p2.tolist() if p2 is not None else None) 
                             for p1, p2 in controller.probs_history] if controller else []
        }
        
        session_data = {
            'image': img_str,
            'filename': filename,
            'controller_state': controller_state
        }
        
        with open(session_file, 'w') as f:
            json.dump(session_data, f)
            
    except Exception as e:
        print(json.dumps({'error': f'Failed to save session: {e}'}))
        sys.exit(1)

def load_session_state():
    """Load session state from JSON file"""
    try:
        if not os.path.exists(session_file):
            return None, None, None
            
        with open(session_file, 'r') as f:
            session_data = json.load(f)
            
        # Reconstruct image from base64
        image = None
        if session_data.get('image'):
            img_data = base64.b64decode(session_data['image'])
            nparr = np.frombuffer(img_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
        # Reconstruct controller
        controller = None
        if image is not None and session_data.get('controller_state'):
            controller = InteractiveController(
                net=model,
                device=model_config.get('device', 'cpu'),
                predictor_params={'brs_mode': 'NoBRS'},
                update_image_callback=lambda reset_canvas=False: None,
                prob_thresh=0.5
            )
            controller.set_image(image)
            
            # Restore controller state
            state = session_data['controller_state']
            controller.object_count = state.get('object_count', 0)
            
            # Restore clicks
            for coords, is_positive in state.get('clicks_list', []):
                click = clicker.Click(is_positive=is_positive, coords=coords)
                controller.clicker.add_click(click)
                
            # Restore result mask
            if state.get('result_mask'):
                controller._result_mask = np.array(state['result_mask'])
                
            # Restore probs history
            controller.probs_history = []
            for p1_data, p2_data in state.get('probs_history', []):
                p1 = np.array(p1_data) if p1_data else None
                p2 = np.array(p2_data) if p2_data else None
                controller.probs_history.append((p1, p2))
                
        return controller, image, session_data.get('filename')
        
    except Exception as e:
        print(json.dumps({'error': f'Failed to load session: {e}'}))
        return None, None, None

def clear_session():
    """Clear session state"""
    if os.path.exists(session_file):
        os.remove(session_file)

# Load model (once per process)
with contextlib.redirect_stdout(io.StringIO()):
    model_config = get_model_config()
    model = load_model_from_config(model_config)

def to_base64_img(img):
    pil_image = Image.fromarray(img)
    buffer = io.BytesIO()
    pil_image.save(buffer, format='PNG')
    return base64.b64encode(buffer.getvalue()).decode()

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No action specified'}))
        sys.exit(1)
    action = sys.argv[1]
    payload = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    try:
        result = {}
        if action == 'load_image_by_name':
            filename = payload.get('filename')
            if not filename:
                print(json.dumps({'error': 'No filename provided'}))
                sys.exit(1)
            # Load image from disk - use absolute path
            image_path = '/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/JPEGImages/' + filename
            if not os.path.exists(image_path):
                print(json.dumps({'error': f'Image not found: {image_path}'}))
                sys.exit(1)
            image = cv2.imread(image_path)
            if image is None:
                print(json.dumps({'error': f'Failed to load image: {image_path}'}))
                sys.exit(1)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            controller = InteractiveController(
                net=model,
                device=model_config.get('device', 'cpu'),
                predictor_params={'brs_mode': 'NoBRS'},
                update_image_callback=lambda reset_canvas=False: None,
                prob_thresh=0.5
            )
            controller.set_image(image)
            save_session_state(controller, image, filename)
            img_str = to_base64_img(image)
            result = {'success': True, 'image': img_str, 'width': image.shape[1], 'height': image.shape[0]}
        elif action == 'add_click':
            current_controller, current_image, current_filename = load_session_state()
            if not current_controller:
                print(json.dumps({'error': 'No image loaded'}))
                sys.exit(1)
            x = payload.get('x')
            y = payload.get('y')
            is_positive = payload.get('is_positive', True)
            current_controller.add_click(x, y, is_positive)
            vis_image = current_controller.get_visualization(alpha_blend=0.5, click_radius=3)
            img_str = to_base64_img(vis_image)
            save_session_state(current_controller, current_image, current_filename)
            result = {'success': True, 'image': img_str, 'clicks_count': len(current_controller.clicker.clicks_list)}
        elif action == 'finish_object':
            current_controller, current_image, current_filename = load_session_state()
            if not current_controller:
                print(json.dumps({'error': 'No image loaded'}))
                sys.exit(1)
            current_controller.finish_object()
            vis_image = current_controller.get_visualization(alpha_blend=0.5, click_radius=3)
            img_str = to_base64_img(vis_image)
            save_session_state(current_controller, current_image, current_filename)
            result = {'success': True, 'image': img_str, 'object_count': current_controller.object_count}
        elif action == 'undo_click':
            current_controller, current_image, current_filename = load_session_state()
            if not current_controller:
                print(json.dumps({'error': 'No image loaded'}))
                sys.exit(1)
            current_controller.undo_click()
            vis_image = current_controller.get_visualization(alpha_blend=0.5, click_radius=3)
            img_str = to_base64_img(vis_image)
            save_session_state(current_controller, current_image, current_filename)
            result = {'success': True, 'image': img_str, 'clicks_count': len(current_controller.clicker.clicks_list)}
        elif action == 'reset_clicks':
            current_controller, current_image, current_filename = load_session_state()
            if not current_controller:
                print(json.dumps({'error': 'No image loaded'}))
                sys.exit(1)
            current_controller.reset_last_object()
            vis_image = current_controller.get_visualization(alpha_blend=0.5, click_radius=3)
            img_str = to_base64_img(vis_image)
            save_session_state(current_controller, current_image, current_filename)
            result = {'success': True, 'image': img_str, 'clicks_count': 0}
        elif action == 'save_ritm_json':
            clear_session()
            result = {'success': True}
        else:
            result = {'error': f'Unknown action: {action}'}
        print(json.dumps(result))
    except Exception as e:
        tb = traceback.format_exc()
        print(json.dumps({'error': str(e), 'trace': tb}))
        sys.exit(1)

if __name__ == '__main__':
    main() 