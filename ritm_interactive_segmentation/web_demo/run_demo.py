#!/usr/bin/env python3
"""
Startup script for the Interactive Segmentation Web Demo.
This script provides an easy way to run the demo with different configurations.
"""

import os
import sys
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Interactive Segmentation Web Demo')
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on (default: 5000)')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to (default: 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    parser.add_argument('--model-type', type=str, choices=['dummy', 'pytorch', 'onnx'], 
                       default='dummy', help='Type of model to use (default: dummy)')
    parser.add_argument('--model-path', type=str, help='Path to model file')
    parser.add_argument('--device', type=str, choices=['cpu', 'cuda'], default='cpu',
                       help='Device to run model on (default: cpu)')
    
    args = parser.parse_args()
    
    # Check if we're in the right directory
    if not os.path.exists('app.py'):
        print("Error: app.py not found. Please run this script from the web_demo directory.")
        sys.exit(1)
    
    # Update model configuration based on command line arguments
    from model_loader import get_model_config
    
    config = get_model_config()
    config['model_type'] = args.model_type
    config['device'] = args.device
    
    if args.model_path:
        config['model_path'] = args.model_path
    
    # Save configuration to a temporary file that app.py can read
    import json
    with open('temp_config.json', 'w') as f:
        json.dump(config, f)
    
    try:
        # Import and run the Flask app
        from app import app
        
        print("=" * 60)
        print("Interactive Segmentation Web Demo")
        print("=" * 60)
        print(f"Model type: {config['model_type']}")
        print(f"Device: {config['device']}")
        if config.get('model_path'):
            print(f"Model path: {config['model_path']}")
        print(f"Server: http://{args.host}:{args.port}")
        print("=" * 60)
        print("Press Ctrl+C to stop the server")
        print("=" * 60)
        
        app.run(
            host=args.host,
            port=args.port,
            debug=args.debug
        )
        
    except KeyboardInterrupt:
        print("\nShutting down server...")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)
    finally:
        # Clean up temporary config file
        if os.path.exists('temp_config.json'):
            os.remove('temp_config.json')

if __name__ == '__main__':
    main() 