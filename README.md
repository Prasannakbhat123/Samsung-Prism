# Samsung-Prism: Interactive Image Segmentation & Annotation Suite

Samsung-Prism is a comprehensive toolkit for interactive image segmentation, annotation, and video object tracking. It combines modern deep learning models (RITM, XMem) with a user-friendly web interface and powerful Python utilities for mask/JSON conversion and dataset management.

---

## Features

- **Interactive Image Segmentation**: Annotate images using polygons or advanced AI models.
- **RITM (Reviving Iterative Training with Mask guidance)**: Fast, interactive segmentation with clicks.
- **XMem**: State-of-the-art video object segmentation and tracking.
- **Polygon Annotation Tools**: Draw, edit, and export polygons for precise labeling.
- **Mask ↔ JSON Conversion**: Seamlessly convert between segmentation masks and JSON polygon annotations.
- **Meta Tools**: Generate and use metadata for advanced workflows.
- **Multi-format Support**: RGB, grayscale, and paletted masks.
- **Modern Web UI**: Built with React (Vite), Tailwind, and Flask backend.

---

## Directory Structure

- `/frontend` — React web app (Vite, Tailwind)
- `/backend` — Python Flask/Express backend for annotation storage and API
- `/ritm_interactive_segmentation` — RITM web demo, mask-to-JSON, and helper scripts
- `/XMem2-cpu-web` — XMem video object segmentation/tracking
- `/src/scripts` — Python utilities for mask/JSON conversion, meta, etc.
- `/src/JPEGImages` — Input images
- `/src/mask-ritm` — RITM-generated masks
- `/src/json` — Output JSON annotations
- `/src/Annotations` — Additional mask storage

---

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repo-url>
cd Samsung-Prism
```

### 2. Install Node/Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 3. Install Python Dependencies
- Use Python 3.8+
- Recommended: Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# (requirements.txt should include opencv-python, numpy, flask, etc.)
```

### 4. Install RITM & XMem Dependencies
- RITM: See `/ritm_interactive_segmentation/README.md` for model weights and extra setup
- XMem: See `/XMem2-cpu-web/README.md` for model weights and setup

### 5. Start Backend (Flask)
```bash
cd ritm_interactive_segmentation/web_demo
python app.py
```

### 6. Start Frontend (React)
```bash
cd frontend
npm run dev
```

---

## How Everything Works Together

### **User Workflow**
1. **Load Image**: Select or upload an image from the UI.
2. **Annotate**: Use polygon tools or RITM interactive segmentation (click-based) to segment objects.
3. **RITM Mode**: Click to add foreground/background points. RITM generates a mask in real time.
4. **Switch Modes**: Toggle between RITM and manual polygon annotation. When switching from RITM, the mask is auto-converted to JSON polygons.
5. **Export**: Download/export JSON annotations or masks.
6. **Video/Sequence**: Use XMem for video object tracking and segmentation (see XMem section).

### **Data Flow**
- **Masks** are saved in `/src/mask-ritm` (RITM) or `/src/Annotations` (manual/other tools).
- **JSON** annotations are saved in `/src/json`.
- **Conversion**: Use provided scripts to convert between mask and JSON formats, or to generate meta files.

---

## Advanced Tools & Scripts

### **Mask to JSON**
- Convert segmentation masks (grayscale or RGB) to polygon-based JSON annotations.
- Supports both single-channel and multi-class color masks.
- Color mapping (BGR):
  - (0, 0, 255): "1" (Red)
  - (255, 0, 0): "2" (Blue)
  - (0, 255, 0): "3" (Green)
  - (255, 255, 0): "4" (Cyan)
  - (255, 0, 255): "5" (Magenta)
  - (0, 255, 255): "6" (Yellow)
  - (128, 0, 128): "7" (Purple)
  - (255, 165, 0): "8" (Orange)

### **JSON to Mask**
- Convert polygon JSON annotations back to color masks for training or visualization.
- See `/src/scripts/create_masks.py` and related scripts.

### **Meta Tools**
- Generate `meta.json` files for advanced workflows (e.g., matching instances across frames).
- See `/src/scripts/generate_meta_json.py`.

### **Helper Scripts**
- `/ritm_interactive_segmentation/web_demo/mask_to_json.py`: Main mask-to-JSON logic for web demo.
- `/src/scripts/mask_to_json_fixed.py`: Robust mask-to-JSON for batch processing.
- `/ritm_interactive_segmentation/p2m-m2p/`: Point-to-mask and mask-to-point conversion utilities.

### **XMem Integration**
- `/XMem2-cpu-web/`: Video object segmentation and tracking.
- Use for propagating masks across video frames.
- See XMem README for details.

---

## Usage Guide

1. **Start all servers (backend, frontend, RITM/XMem as needed).**
2. **Open the web UI** (usually at http://localhost:5173 or http://localhost:3000).
3. **Load an image** and annotate using polygons or RITM.
4. **Switch modes** as needed; RITM masks are auto-converted to JSON.
5. **Export** your work as JSON or mask images.
6. **For video:** Use XMem for tracking/propagation.
7. **Use scripts** for batch conversion or dataset management.

---

## Troubleshooting & Tips
- Ensure all dependencies (Python, Node, model weights) are installed.
- For RITM/XMem, download the required model weights as per their READMEs.
- Use only lossless PNG masks for best results.
- For custom color mappings, update the color dictionaries in the relevant scripts.
- If you encounter errors, check the console/logs for details.

---

## License

[MIT License](LICENSE)