"""
Model loader utility for the interactive segmentation web demo.
This file provides examples of how to load different types of segmentation models.
"""

import torch
import torch.nn as nn
import numpy as np
from typing import Optional, Dict, Any


class DummyModel(nn.Module):
    """
    A dummy model for testing purposes.
    This creates random predictions to demonstrate the interface.
    """
    
    def __init__(self, input_channels=3, num_classes=1):
        super(DummyModel, self).__init__()
        self.input_channels = input_channels
        self.num_classes = num_classes
        self.with_prev_mask = True  # Simulate model that supports previous masks
        
        # Simple convolutional layers for demonstration
        self.conv1 = nn.Conv2d(input_channels, 64, kernel_size=3, padding=1)
        self.conv2 = nn.Conv2d(64, 64, kernel_size=3, padding=1)
        self.conv3 = nn.Conv2d(64, num_classes, kernel_size=1)
        self.relu = nn.ReLU(inplace=True)
        
    def forward(self, x, points=None, prev_mask=None):
        """
        Forward pass that generates dummy predictions.
        In a real model, this would use the actual segmentation logic.
        """
        # Simple forward pass
        x = self.relu(self.conv1(x))
        x = self.relu(self.conv2(x))
        x = self.conv3(x)
        
        # Generate dummy predictions based on input size
        batch_size, channels, height, width = x.shape
        
        # Create a dummy mask (random for demonstration)
        if points is not None and len(points) > 0:
            # Create a simple mask based on click positions
            mask = torch.zeros((batch_size, 1, height, width), device=x.device)
            for point in points:
                if hasattr(point, 'coords') and hasattr(point, 'is_positive'):
                    y, x = point.coords
                    if 0 <= x < width and 0 <= y < height:
                        # Create a simple circular mask around the click
                        y_coords, x_coords = torch.meshgrid(
                            torch.arange(height, device=x.device),
                            torch.arange(width, device=x.device)
                        )
                        distance = torch.sqrt((x_coords - x)**2 + (y_coords - y)**2)
                        circle_mask = distance < 20  # 20 pixel radius
                        
                        if point.is_positive:
                            mask[0, 0] += circle_mask.float()
                        else:
                            mask[0, 0] -= circle_mask.float()
            
            # Normalize and apply sigmoid
            mask = torch.sigmoid(mask)
            return mask
        else:
            # Return random predictions if no clicks
            return torch.sigmoid(torch.randn_like(x))


def load_dummy_model(device: str = 'cpu') -> nn.Module:
    """
    Load a dummy model for testing the web interface.
    
    Args:
        device: Device to load the model on ('cpu' or 'cuda')
        
    Returns:
        Loaded model
    """
    model = DummyModel()
    model.to(device)
    model.eval()
    return model


def load_pytorch_model(model_path: str, model_class, device: str = 'cpu', **kwargs) -> nn.Module:
    """
    Load a PyTorch model from a saved checkpoint.
    
    Args:
        model_path: Path to the model checkpoint (.pth file)
        model_class: Model class to instantiate
        device: Device to load the model on
        **kwargs: Additional arguments to pass to the model constructor
        
    Returns:
        Loaded model
    """
    try:
        # Create model instance
        model = model_class(**kwargs)
        
        # Load checkpoint
        checkpoint = torch.load(model_path, map_location=device)
        
        # Handle different checkpoint formats
        if 'state_dict' in checkpoint:
            model.load_state_dict(checkpoint['state_dict'])
        elif 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
        else:
            model.load_state_dict(checkpoint)
        
        model.to(device)
        model.eval()
        
        print(f"Model loaded successfully from {model_path}")
        return model
        
    except Exception as e:
        print(f"Error loading model: {e}")
        print("Falling back to dummy model")
        return load_dummy_model(device)


def load_onnx_model(model_path: str, device: str = 'cpu') -> Any:
    """
    Load an ONNX model.
    
    Args:
        model_path: Path to the ONNX model file
        device: Device to load the model on
        
    Returns:
        ONNX model session
    """
    try:
        import onnxruntime as ort
        
        # Create ONNX Runtime session
        providers = ['CUDAExecutionProvider', 'CPUExecutionProvider'] if device == 'cuda' else ['CPUExecutionProvider']
        session = ort.InferenceSession(model_path, providers=providers)
        
        print(f"ONNX model loaded successfully from {model_path}")
        return session
        
    except ImportError:
        print("ONNX Runtime not installed. Install with: pip install onnxruntime")
        return None
    except Exception as e:
        print(f"Error loading ONNX model: {e}")
        return None


def create_model_wrapper(model, model_type: str = 'pytorch'):
    """
    Create a wrapper around the model to standardize the interface.
    
    Args:
        model: The loaded model
        model_type: Type of model ('pytorch', 'onnx', 'dummy')
        
    Returns:
        Model wrapper with standardized interface
    """
    if model_type == 'pytorch':
        return PyTorchModelWrapper(model)
    elif model_type == 'onnx':
        return ONNXModelWrapper(model)
    else:
        return DummyModelWrapper(model)


class PyTorchModelWrapper:
    """Wrapper for PyTorch models to standardize the interface."""
    
    def __init__(self, model):
        self.model = model
        self.with_prev_mask = getattr(model, 'with_prev_mask', False)
    
    def __call__(self, *args, **kwargs):
        return self.model(*args, **kwargs)
    
    def eval(self):
        self.model.eval()
    
    def to(self, device):
        self.model.to(device)


class ONNXModelWrapper:
    """Wrapper for ONNX models to standardize the interface."""
    
    def __init__(self, session):
        self.session = session
        self.with_prev_mask = False  # ONNX models typically don't support this
    
    def __call__(self, *args, **kwargs):
        # Convert PyTorch tensors to numpy for ONNX
        inputs = {}
        for i, arg in enumerate(args):
            if isinstance(arg, torch.Tensor):
                inputs[f'input_{i}'] = arg.cpu().numpy()
        
        # Run inference
        outputs = self.session.run(None, inputs)
        return torch.from_numpy(outputs[0])
    
    def eval(self):
        pass  # ONNX models are always in eval mode
    
    def to(self, device):
        pass  # ONNX models handle device internally


class DummyModelWrapper:
    """Wrapper for dummy models."""
    
    def __init__(self, model):
        self.model = model
        self.with_prev_mask = getattr(model, 'with_prev_mask', True)
    
    def __call__(self, *args, **kwargs):
        return self.model(*args, **kwargs)
    
    def eval(self):
        self.model.eval()
    
    def to(self, device):
        self.model.to(device)


# Example usage and configuration
def get_model_config() -> Dict[str, Any]:
    """
    Get model configuration for the web demo.
    Modify this function to load your specific model.
    """
    config = {
        'model_type': 'pytorch',  # 'pytorch', 'onnx', or 'dummy'
        'model_path': '/home/aravinthakshan/Projects/ritm_interactive_segmentation/weights/hrnet18_cocolvis_itermask_3p.pth',  # Path to your model file
        'device': 'cpu',        # 'cpu' or 'cuda'
        'model_class': None,    # Will use the original model loading function
        'model_kwargs': {}      # Additional arguments for model constructor
    }
    
    # Example: Load a real PyTorch model
    # config.update({
    #     'model_type': 'pytorch',
    #     'model_path': 'path/to/your/model.pth',
    #     'model_class': YourModelClass,
    #     'model_kwargs': {'num_classes': 1},
    #     'device': 'cuda' if torch.cuda.is_available() else 'cpu'
    # })
    
    return config


def load_model_from_config(config: Dict[str, Any]) -> nn.Module:
    """
    Load a model based on the configuration.
    
    Args:
        config: Model configuration dictionary
        
    Returns:
        Loaded model
    """
    model_type = config.get('model_type', 'dummy')
    device = config.get('device', 'cpu')
    
    if model_type == 'pytorch':
        model_path = config.get('model_path')
        model_class = config.get('model_class')
        model_kwargs = config.get('model_kwargs', {})
        
        if model_path and model_class:
            return load_pytorch_model(model_path, model_class, device, **model_kwargs)
        elif model_path:
            # Use the original isegm model loading mechanism
            try:
                from isegm.inference import utils
                model = utils.load_is_model(model_path, device, cpu_dist_maps=True)
                print(f"Model loaded successfully from {model_path}")
                return model
            except Exception as e:
                print(f"Error loading isegm model: {e}")
                print("Falling back to dummy model")
                return load_dummy_model(device)
        else:
            print("PyTorch model path not specified, using dummy model")
            return load_dummy_model(device)
    
    elif model_type == 'onnx':
        model_path = config.get('model_path')
        if model_path:
            onnx_model = load_onnx_model(model_path, device)
            if onnx_model:
                return create_model_wrapper(onnx_model, 'onnx')
        
        print("ONNX model path not specified or loading failed, using dummy model")
        return load_dummy_model(device)
    
    else:  # dummy
        return load_dummy_model(device)


if __name__ == "__main__":
    # Test the model loader
    config = get_model_config()
    model = load_model_from_config(config)
    print(f"Model loaded: {type(model)}")
    print(f"Supports previous mask: {getattr(model, 'with_prev_mask', False)}") 