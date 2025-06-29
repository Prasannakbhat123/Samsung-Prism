import sys
import os

# Add backend scripts directory to sys.path
sys.path.append('/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src/scripts')
from mask_to_json import mask_to_json

def main():
    # Path to a mask in web_demo/masks
    base_dir = os.path.dirname(__file__)
    masks_dir = os.path.join(base_dir, 'masks')
    test_dir = os.path.join(base_dir, 'test')
    os.makedirs(test_dir, exist_ok=True)
    # Find a .png mask file
    mask_files = [f for f in os.listdir(masks_dir) if f.endswith('.png')]
    if not mask_files:
        print('No mask PNG files found in masks directory.')
        return
    mask_path = os.path.join(masks_dir, mask_files[0])
    print(f'Using mask: {mask_path}')
    try:
        mask_to_json(mask_path, test_dir)
        print(f'mask_to_json (backend) ran successfully. Output in: {test_dir}')
    except Exception as e:
        print(f'Error running mask_to_json: {e}')

if __name__ == '__main__':
    main() 