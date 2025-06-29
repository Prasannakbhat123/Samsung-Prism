from flask import Flask, render_template, request, jsonify, send_file
import cv2
import numpy as np
import base64
import io
from PIL import Image
import os
import tempfile
import json

# Add parent directory to Python path for isegm module
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the controller from the original demo
from interactive_demo.controller import InteractiveController

# Import model loader
from model_loader import load_model_from_config, get_model_config

app = Flask(__name__)

# Global variables to store the current session state
current_controller = None
current_image = None
session_data = {}

# Load model at startup
print("Loading model...")
model_config = get_model_config()
model = load_model_from_config(model_config)
print(f"Model loaded: {type(model)}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload_image', methods=['POST'])
def upload_image():
    global current_controller, current_image, session_data
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400
    
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No image selected'}), 400
    
    try:
        # Read and process the image
        image_data = file.read()
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Ensure image is 3-channel RGB (remove alpha channel if present)
        if len(image.shape) == 3 and image.shape[2] == 4:
            # Convert RGBA to RGB
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)
        elif len(image.shape) == 3 and image.shape[2] == 1:
            # Convert grayscale to RGB
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
        
        print(f"Image shape after processing: {image.shape}")
        print(f"Image dtype: {image.dtype}")
        
        # Initialize controller with the loaded model
        current_image = image
        current_controller = InteractiveController(
            net=model,  # Use the loaded model
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
        
        return jsonify({
            'success': True,
            'image': img_str,
            'width': image.shape[1],
            'height': image.shape[0]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/add_click', methods=['POST'])
def add_click():
    global current_controller
    
    if current_controller is None:
        return jsonify({'error': 'No image loaded'}), 400
    
    data = request.get_json()
    x = data.get('x')
    y = data.get('y')
    is_positive = data.get('is_positive', True)
    
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
            
            return jsonify({
                'success': True,
                'image': img_str,
                'clicks_count': len(current_controller.clicker.clicks_list)
            })
        else:
            return jsonify({'error': 'Failed to generate visualization'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/finish_object', methods=['POST'])
def finish_object():
    global current_controller
    
    if current_controller is None:
        return jsonify({'error': 'No image loaded'}), 400
    
    try:
        current_controller.finish_object()
        
        # Get the visualization
        vis_image = current_controller.get_visualization(alpha_blend=0.5, click_radius=3)
        
        if vis_image is not None:
            # Convert to base64
            pil_image = Image.fromarray(vis_image)
            buffer = io.BytesIO()
            pil_image.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return jsonify({
                'success': True,
                'image': img_str,
                'object_count': current_controller.object_count
            })
        else:
            return jsonify({'error': 'Failed to generate visualization'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/undo_click', methods=['POST'])
def undo_click():
    global current_controller
    
    if current_controller is None:
        return jsonify({'error': 'No image loaded'}), 400
    
    try:
        current_controller.undo_click()
        
        # Get the visualization
        vis_image = current_controller.get_visualization(alpha_blend=0.5, click_radius=3)
        
        if vis_image is not None:
            # Convert to base64
            pil_image = Image.fromarray(vis_image)
            buffer = io.BytesIO()
            pil_image.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return jsonify({
                'success': True,
                'image': img_str,
                'clicks_count': len(current_controller.clicker.clicks_list)
            })
        else:
            return jsonify({'error': 'Failed to generate visualization'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/reset_clicks', methods=['POST'])
def reset_clicks():
    global current_controller
    
    if current_controller is None:
        return jsonify({'error': 'No image loaded'}), 400
    
    try:
        current_controller.reset_last_object()
        
        # Get the visualization
        vis_image = current_controller.get_visualization(alpha_blend=0.5, click_radius=3)
        
        if vis_image is not None:
            # Convert to base64
            pil_image = Image.fromarray(vis_image)
            buffer = io.BytesIO()
            pil_image.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            return jsonify({
                'success': True,
                'image': img_str,
                'clicks_count': 0
            })
        else:
            return jsonify({'error': 'Failed to generate visualization'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/save_mask', methods=['POST'])
def save_mask():
    global current_controller
    
    if current_controller is None:
        return jsonify({'error': 'No image loaded'}), 400
    
    try:
        mask = current_controller.result_mask
        
        if mask is None:
            return jsonify({'error': 'No mask to save'}), 400
        
        # Convert mask to image
        if mask.max() < 256:
            mask = mask.astype(np.uint8)
            mask *= 255 // mask.max() if mask.max() > 0 else 255
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
            cv2.imwrite(tmp_file.name, mask)
            tmp_filename = tmp_file.name
        
        return send_file(tmp_filename, as_attachment=True, download_name='mask.png')
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/model_info', methods=['GET'])
def model_info():
    """Get information about the loaded model."""
    return jsonify({
        'model_type': model_config.get('model_type', 'unknown'),
        'device': model_config.get('device', 'cpu'),
        'supports_prev_mask': getattr(model, 'with_prev_mask', False),
        'model_class': type(model).__name__
    })

if __name__ == '__main__':
    print("Starting Interactive Segmentation Web Demo...")
    print(f"Model type: {model_config.get('model_type', 'unknown')}")
    print(f"Device: {model_config.get('device', 'cpu')}")
    print("Open your browser and navigate to: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000) 