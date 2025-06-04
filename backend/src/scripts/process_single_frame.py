#!/usr/bin/env python3

import os
import sys
import json
from pathlib import Path
import argparse

# Add the XMem project root to Python path
xmem_root = str(Path('/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/XMem2-cpu-web'))
if xmem_root not in sys.path:
    sys.path.append(xmem_root)

from inference.run_on_video import run_on_video

def process_single_frame(current_frame_number):
    """
    Process a single frame using the previous frame's mask as reference.
    
    Args:
        current_frame_number (int): The frame number to process (e.g., 2 for frame_000002)
    """
    result = {"success": False, "message": "", "error": None}
    
    try:
        # Define paths
        base_dir = Path('/home/aravinthakshan/Projects/Samsung2/Samsung-Prism/backend/src')
        frames_dir = base_dir / 'JPEGImages'
        masks_dir = base_dir / 'Annotations'
        output_dir = base_dir / 'predicted_masks'

        # Ensure the frame number is valid
        if current_frame_number <= 1:
            raise ValueError("Cannot process frame 1 or lower - first frame must be manually annotated")

        # Create temporary directory for the two frames we need
        temp_dir = base_dir / 'temp_frames'
        temp_dir.mkdir(exist_ok=True)

        # Previous frame number (reference frame)
        prev_frame_number = current_frame_number - 1
        
        # Format frame numbers
        prev_frame = f"frame_{prev_frame_number:06d}.jpg"
        current_frame = f"frame_{current_frame_number:06d}.jpg"
        prev_mask = f"frame_{prev_frame_number:06d}.png"

        # Check if previous mask exists
        if not (masks_dir / prev_mask).exists():
            raise FileNotFoundError(f"Previous frame's mask not found: {prev_mask}")

        # Create symbolic links for the frames we need
        os.symlink(str(frames_dir / prev_frame), str(temp_dir / prev_frame))
        os.symlink(str(frames_dir / current_frame), str(temp_dir / current_frame))

        # Create temporary directory for the reference mask
        temp_masks_dir = base_dir / 'temp_masks'
        temp_masks_dir.mkdir(exist_ok=True)
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
            print_progress=True
        )

        # Move the predicted mask to Annotations directory
        predicted_mask = f"frame_{current_frame_number:06d}.png"
        if (output_dir / 'masks' / predicted_mask).exists():
            os.rename(
                str(output_dir / 'masks' / predicted_mask),
                str(masks_dir / predicted_mask)
            )

            # Convert the new mask to JSON
            from mask_to_json import mask_to_json
            mask_to_json(str(masks_dir / predicted_mask), str(base_dir / 'json'))
            result["success"] = True
            result["message"] = f"Successfully processed frame {current_frame_number}"
        else:
            raise FileNotFoundError(f"Model did not generate mask for frame {current_frame_number}")

    except Exception as e:
        result["error"] = str(e)
        result["message"] = f"Error processing frame {current_frame_number}: {str(e)}"
    finally:
        # Cleanup
        if temp_dir.exists():
            for f in temp_dir.glob('*'):
                if f.is_symlink():
                    f.unlink()
            temp_dir.rmdir()
        if temp_masks_dir.exists():
            for f in temp_masks_dir.glob('*'):
                if f.is_symlink():
                    f.unlink()
            temp_masks_dir.rmdir()
        
        # Print result as JSON
        print(json.dumps(result))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process a single frame using the previous frame as reference')
    parser.add_argument('frame_number', type=int, help='Frame number to process (e.g., 2 for frame_000002)')
    args = parser.parse_args()

    process_single_frame(args.frame_number) 