#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the ritm_interactive_segmentation directory
cd "$SCRIPT_DIR/../../ritm_interactive_segmentation"

# Check if virtual environment exists
if [ ! -d "env" ]; then
    echo "Error: Virtual environment 'env' not found in $(pwd)"
    exit 1
fi

# Check if Flask app exists
if [ ! -f "web_demo/app.py" ]; then
    echo "Error: Flask app 'web_demo/app.py' not found in $(pwd)"
    exit 1
fi

echo "Activating virtual environment..."
source env/bin/activate

echo "Starting Flask application..."
python web_demo/app.py