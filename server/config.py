"""Paths and settings. Everything can be overridden with environment variables."""
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

RITM_ROOT = REPO_ROOT / 'ritm_interactive_segmentation'
XMEM_ROOT = REPO_ROOT / 'XMem2-cpu-web'

# Projects (uploaded frames + annotations) live here, outside the source tree.
DATA_DIR = Path(os.environ.get('PRISM_DATA_DIR', REPO_ROOT / 'data')).resolve()

RITM_WEIGHTS = Path(os.environ.get(
    'PRISM_RITM_WEIGHTS', RITM_ROOT / 'weights' / 'hrnet18_cocolvis_itermask_3p.pth'))
XMEM_WEIGHTS = Path(os.environ.get('PRISM_XMEM_WEIGHTS', XMEM_ROOT / 'saves' / 'XMem.pth'))

FRONTEND_DIST = REPO_ROOT / 'web' / 'dist'

HOST = os.environ.get('PRISM_HOST', '127.0.0.1')
PORT = int(os.environ.get('PRISM_PORT', '8000'))

# RITM (isegm) and XMem (model, inference, util, dataset)
# are plain source trees rather than installed packages.
for root in (RITM_ROOT, XMEM_ROOT):
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))
