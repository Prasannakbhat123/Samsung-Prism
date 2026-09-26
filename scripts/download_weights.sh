#!/usr/bin/env bash
# Download the RITM and XMem checkpoints into the paths the server expects.
set -euo pipefail
cd "$(dirname "$0")/.."

fetch() {  # url dest sha256
  local url=$1 dest=$2 sha=$3
  if [ -f "$dest" ] && echo "$sha  $dest" | shasum -a 256 -c --status 2>/dev/null; then
    echo "ok       $dest"
    return
  fi
  mkdir -p "$(dirname "$dest")"
  echo "download $dest"
  curl -fL --progress-bar -o "$dest.part" "$url"
  echo "$sha  $dest.part" | shasum -a 256 -c --status || { echo "checksum mismatch for $url" >&2; exit 1; }
  mv "$dest.part" "$dest"
}

# RITM HRNet-18 IT-M (COCO+LVIS). The original saic-vul/SamsungLabs release is
# gone; this is the identical file (same SHA-256) re-hosted by the XMem/Cutie author.
fetch https://github.com/hkchengrex/Cutie/releases/download/v1.0/coco_lvis_h18_itermask.pth \
  ritm_interactive_segmentation/weights/hrnet18_cocolvis_itermask_3p.pth \
  5f69cfce354d1507e3850bfc39ee7057c8dd27b6a4910d1d2dc724916b9ee32b

fetch https://github.com/hkchengrex/XMem/releases/download/v1.0/XMem.pth \
  XMem2-cpu-web/saves/XMem.pth \
  27776291d2f0639b4e6b372a67651579b51180aa4d8f8f89bbff2dcc09ebf6f9
