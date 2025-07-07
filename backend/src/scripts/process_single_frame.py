#!/usr/bin/env python3

import os
import sys
import json
from pathlib import Path
import argparse
import subprocess

# Add the XMem project root to Python path
xmem_root = Path(__file__).resolve().parents[3] / 'XMem2-cpu-web'
print(xmem_root)
if str(xmem_root) not in sys.path:
    sys.path.append(str(xmem_root))

from inference.run_on_video import run_on_video
import torch

def process_single_frame(current_frame_number):
    """
    Process a single frame using the previous frame's mask as reference.
    
    Args:
        current_frame_number (int): The frame number to process (e.g., 1 for frame_000001)
    """
    result = {"success": False, "message": "", "error": None}
    print(f"Processing frame {current_frame_number}, looking for frame_{current_frame_number:06d}.jpg", file=sys.stderr)
    
    try:
        # Define paths first
        base_dir = Path(__file__).resolve().parent.parent 
        frames_dir = base_dir / 'JPEGImages'
        masks_dir = base_dir / 'Annotations'
        output_dir = base_dir / 'predicted_masks'
        temp_dir = base_dir / 'temp_frames'
        temp_masks_dir = base_dir / 'temp_masks'

        print(f"Using directories:", file=sys.stderr)
        print(f"  Frames dir: {frames_dir} (exists: {frames_dir.exists()})", file=sys.stderr)
        print(f"  Masks dir: {masks_dir} (exists: {masks_dir.exists()})", file=sys.stderr)
        print(f"  Output dir: {output_dir} (exists: {output_dir.exists()})", file=sys.stderr)

        # Clean up any existing temp directories first
        if temp_dir.exists():
            for f in temp_dir.glob('*'):
                if f.is_symlink() or f.is_file():
                    f.unlink()
            temp_dir.rmdir()
        if temp_masks_dir.exists():
            for f in temp_masks_dir.glob('*'):
                if f.is_symlink() or f.is_file():
                    f.unlink()
            temp_masks_dir.rmdir()

        # Now create fresh temp directories
        temp_dir.mkdir(exist_ok=True)
        temp_masks_dir.mkdir(exist_ok=True)

        print(f"Starting to process frame {current_frame_number}", file=sys.stderr)
        
        # Set up XMem configuration with correct model path
        config = {
            'model': str(xmem_root / 'saves' / 'XMem.pth'),
            's2m_model': str(xmem_root / 'saves' / 's2m.pth'),
            'fbrs_model': str(xmem_root / 'saves' / 'fbrs.pth')
        }

        # Ensure the frame number is valid
        if current_frame_number < 1:
            raise ValueError("Cannot process frame 0 - first frame must be manually annotated")

        # Create symbolic links for the frames we need
        prev_frame_number = current_frame_number - 1
        
        # Format frame numbers
        prev_frame = f"frame_{prev_frame_number:06d}.jpg"
        current_frame = f"frame_{current_frame_number:06d}.jpg"
        prev_mask = f"frame_{prev_frame_number:06d}.png"

        # Check if previous mask exists
        prev_mask_path = masks_dir / prev_mask
        if not prev_mask_path.exists():
            raise FileNotFoundError(f"Previous frame's mask not found: {prev_mask_path}")

        # Check if current frame exists
        current_frame_path = frames_dir / current_frame
        if not current_frame_path.exists():
            raise FileNotFoundError(f"Current frame not found: {current_frame_path}")

        # Create symbolic links for the frames we need
        os.symlink(str(frames_dir / prev_frame), str(temp_dir / prev_frame))
        os.symlink(str(frames_dir / current_frame), str(temp_dir / current_frame))

        # Create temporary directory for the reference mask
        os.symlink(str(masks_dir / prev_mask), str(temp_masks_dir / prev_mask))

        # Ensure output directory exists
        output_dir.mkdir(exist_ok=True)

        # Run the model on just these two frames
        stats = run_on_video(
            imgs_in_path=str(temp_dir),
            masks_in_path=str(temp_masks_dir),
            masks_out_path=str(output_dir),
            frames_with_masks=[prev_frame_number],  # Only use previous frame as reference
            compute_iou=False,
            print_progress=True,
            overwrite_config=config,  # Pass the configuration with correct model paths
            original_memory_mechanism=True  # Add this to use original XMem memory mechanism
        )

        # Move the predicted mask to Annotations directory
        predicted_mask = f"frame_{current_frame_number:06d}.png"
        predicted_mask_path = output_dir / 'masks' / predicted_mask
        if predicted_mask_path.exists():
            os.rename(
                str(predicted_mask_path),
                str(masks_dir / predicted_mask)
            )

            # Convert the new mask to JSON
            from mask_to_json import mask_to_json
            # Generate meta.json before mask_to_json
            meta_script = str(base_dir / 'scripts' / 'generate_meta_json.py')
            meta_json_path = str(base_dir / 'predicted_masks' / 'meta.json')
            subprocess.run(['python3', meta_script], check=True)
            mask_to_json(str(masks_dir / predicted_mask), str(base_dir / 'json'), meta_json_path)
            result["success"] = True
            result["message"] = f"Successfully processed frame {current_frame_number}"
        else:
            raise FileNotFoundError(f"Model did not generate mask for frame {current_frame_number}")

    except Exception as e:
        result["error"] = str(e)
        result["message"] = f"Error processing frame {current_frame_number}: {str(e)}"
    finally:
        if temp_dir and temp_dir.exists():
            for f in temp_dir.glob('*'):
                if f.is_symlink():
                    f.unlink()
            temp_dir.rmdir()
        if temp_masks_dir and temp_masks_dir.exists():
            for f in temp_masks_dir.glob('*'):
                if f.is_symlink():
                    f.unlink()
            temp_masks_dir.rmdir()
        
        # Print result as JSON
        print(json.dumps(result))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process a single frame using the previous frame as reference')
    parser.add_argument('frame_number', type=int, help='Frame number to process (e.g., 1 for frame_000001)')
    args = parser.parse_args()

    process_single_frame(args.frame_number) 