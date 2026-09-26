import os

# Let ops MPS doesn't implement fall back to CPU. Must be set before torch loads.
os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK', '1')
