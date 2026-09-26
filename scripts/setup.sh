#!/usr/bin/env bash
# One-time setup: Python env, model weights, web UI build.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Python environment (.venv)"
if command -v uv >/dev/null 2>&1; then
  [ -d .venv ] || uv venv --python 3.12 .venv
  VIRTUAL_ENV="$PWD/.venv" uv pip install -r requirements.txt
else
  PY=${PYTHON:-python3}
  "$PY" -c 'import sys; assert (3, 10) <= sys.version_info[:2] <= (3, 12), "Python 3.10-3.12 required (or install uv)"'
  [ -d .venv ] || "$PY" -m venv .venv
  .venv/bin/pip install -q --upgrade pip
  .venv/bin/pip install -r requirements.txt
fi

echo "==> Model weights"
scripts/download_weights.sh

echo "==> Web UI"
(cd web && npm install --no-audit --no-fund && npm run build)

echo
echo "Done. Start the app with:"
echo "  .venv/bin/python -m server"
echo "then open http://127.0.0.1:8000"
