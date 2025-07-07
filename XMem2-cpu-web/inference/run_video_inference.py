#!/usr/bin/env python3

import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = str(Path(__file__).parent.parent)
if project_root not in sys.path:
    sys.path.append(project_root)

from inference.run_on_video import run_on_video
import pandas as pd

def main():
    # Define paths
    base_dir = Path(__file__).resolve().parent.parent.parent / 'backend/src'
    
    # Create a temporary directory for flattened frame structure
    flat_frames_dir = base_dir / 'flat_frames'
    os.makedirs(flat_frames_dir, exist_ok=True)
    
    # Create symbolic links to flatten the structure
    temp_dir = base_dir / 'temp'
    for frame_dir in temp_dir.glob('frame_*.jpg'):
        frame_name = frame_dir.name
        source = frame_dir / frame_name
        target = flat_frames_dir / frame_name
        if not target.exists() and source.exists():
            os.symlink(str(source), str(target))
    
    # Input masks directory (your colored segmentation masks)
    masks_in_path = base_dir / 'Annotations'
    
    # Output directory for predicted masks
    masks_out_path = base_dir / 'predicted_masks'
    os.makedirs(masks_out_path, exist_ok=True)
    
    # Apply mask only to the first frame
    frames_with_masks = [0]
    
    try:
        # Run the video processing
        stats = run_on_video(
            imgs_in_path=str(flat_frames_dir),
            masks_in_path=str(masks_in_path),
            masks_out_path=str(masks_out_path),
            frames_with_masks=frames_with_masks,
            compute_iou=False,
            print_progress=True
        )
        
        # If IoU was computed, print the statistics
        if isinstance(stats, pd.DataFrame) and not stats.empty:
            print("\nProcessing Statistics:")
            print(stats)
            
    except Exception as e:
        print(f"Error during video processing: {str(e)}")
    finally:
        # Clean up symbolic links
        if flat_frames_dir.exists():
            for symlink in flat_frames_dir.glob('*'):
                try:
                    os.unlink(str(symlink))
                except:
                    pass
            os.rmdir(str(flat_frames_dir))

if __name__ == "__main__":
    main() 