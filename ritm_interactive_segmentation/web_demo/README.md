# Interactive Segmentation Web Demo

A modern web interface for interactive image segmentation, converted from the original Tkinter-based demo.

## Features

- **Main Click Functionality**: Left click for positive points (foreground), right click for negative points (background)
- **Finish Object**: Complete the current segmentation
- **Reset Click**: Clear all clicks for the current object
- **Undo Click**: Remove the last click
- **Save Mask**: Export the segmentation mask as PNG
- **Modern UI**: Responsive design with drag-and-drop image upload

## Setup

### Prerequisites

- Python 3.8 or higher
- Your trained segmentation model (you'll need to modify the app to load your specific model)

### Installation

1. **Clone or navigate to the web_demo directory**:
   ```bash
   cd web_demo
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up your model**:
   - You'll need to modify `app.py` to load your actual segmentation model
   - Replace the `net=None` line in the `upload_image` function with your model loading code
   - Example:
   ```python
   # Load your model here
   model = load_your_model()
   current_controller = InteractiveController(
       net=model,  # Your loaded model
       device='cpu',  # or 'cuda' if using GPU
       predictor_params={'brs_mode': 'NoBRS'},
       update_image_callback=lambda: None,
       prob_thresh=0.5
   )
   ```

## Usage

1. **Start the server**:
   ```bash
   python app.py
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:5000
   ```

3. **Upload an image**:
   - Drag and drop an image file onto the upload area, or
   - Click "Choose Image" to browse and select a file

4. **Interactive segmentation**:
   - **Left click** on the image to add positive points (foreground)
   - **Right click** on the image to add negative points (background)
   - Use the control buttons to manage your segmentation:
     - **Finish Object**: Complete the current segmentation
     - **Undo Click**: Remove the last click
     - **Reset Clicks**: Clear all clicks for the current object
     - **Save Mask**: Download the segmentation mask

## File Structure

```
web_demo/
├── app.py                 # Flask application
├── templates/
│   └── index.html        # Web interface
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## API Endpoints

- `GET /` - Main web interface
- `POST /upload_image` - Upload and process an image
- `POST /add_click` - Add a click point (positive or negative)
- `POST /finish_object` - Complete current segmentation
- `POST /undo_click` - Remove last click
- `POST /reset_clicks` - Reset all clicks for current object
- `POST /save_mask` - Download segmentation mask

## Customization

### Model Integration

To integrate your specific segmentation model:

1. **Load your model** in the `upload_image` function:
   ```python
   # Example for loading a PyTorch model
   import torch
   from your_model_module import YourModel
   
   model = YourModel()
   model.load_state_dict(torch.load('path/to/your/model.pth'))
   model.eval()
   ```

2. **Update predictor parameters** based on your model's requirements:
   ```python
   predictor_params = {
       'brs_mode': 'NoBRS',  # or other modes your model supports
       'prob_thresh': 0.5,
       # Add other parameters your model needs
   }
   ```

### UI Customization

The web interface is built with vanilla HTML, CSS, and JavaScript. You can customize:

- **Styling**: Modify the CSS in `templates/index.html`
- **Functionality**: Add new features by extending the JavaScript
- **Layout**: Adjust the HTML structure for different layouts

## Troubleshooting

### Common Issues

1. **Model not loading**: Ensure your model path is correct and the model file exists
2. **CUDA errors**: Change `device='cpu'` if you don't have GPU support
3. **Import errors**: Make sure all dependencies are installed and the original `interactive_demo` module is accessible

### Performance Tips

- Use GPU acceleration if available by setting `device='cuda'`
- Consider image resizing for very large images
- Implement caching for repeated operations

## Browser Compatibility

The web interface works with all modern browsers:
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## License

This web demo is based on the original interactive segmentation demo. Please refer to the original project's license for usage terms. 