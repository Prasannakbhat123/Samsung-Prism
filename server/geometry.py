"""Conversions between binary/label masks and polygon outlines."""
import cv2
import numpy as np

MIN_AREA = 20        # ignore specks smaller than this many pixels
SIMPLIFY_EPS = 1.0   # Douglas-Peucker tolerance in pixels


def mask_to_polygons(mask: np.ndarray) -> list:
    """Outer contours of a binary mask as [[x, y], ...] lists, largest first."""
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polygons = []
    for contour in sorted(contours, key=cv2.contourArea, reverse=True):
        if cv2.contourArea(contour) < MIN_AREA:
            continue
        approx = cv2.approxPolyDP(contour, SIMPLIFY_EPS, True).reshape(-1, 2)
        if len(approx) >= 3:
            polygons.append(approx.astype(int).tolist())
    return polygons


def polygons_to_mask(polygons, shape, value=1, out=None) -> np.ndarray:
    """Rasterise polygons into `out` (or a new uint8 mask of `shape`)."""
    if out is None:
        out = np.zeros(shape[:2], dtype=np.uint8)
    pts = [np.asarray(p, dtype=np.int32) for p in polygons if len(p) >= 3]
    if pts:
        cv2.fillPoly(out, pts, int(value))
    return out
