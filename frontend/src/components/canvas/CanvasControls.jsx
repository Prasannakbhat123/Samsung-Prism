import React from 'react';

const CanvasControls = ({
  imageLoadError,
  pointRadius,
  setPointRadius,
  selectedPolygon,
  pointDensity,
  handlePointDensityChange,
  handlePointDensityMouseUp,
  displayMode,
  setDisplayMode
}) => {
  if (imageLoadError) {
    return null; // Don't show controls if image failed to load
  }

  return (
    <div className="mt-4 w-full">
      {/* Point Radius Slider */}
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">
          Point Radius: {pointRadius}px
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={pointRadius}
          onChange={e => setPointRadius(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Point Density Slider (only show when a polygon is selected) */}
      {selectedPolygon && (
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Point Density: {selectedPolygon.points.length} points
          </label>
          <input
            type="range"
            min="6"
            max="100"
            value={pointDensity}
            onChange={handlePointDensityChange}
            onMouseUp={handlePointDensityMouseUp}
            className="w-full"
          />
        </div>
      )}

      {/* Display Mode Toggle */}
      <div className="mb-4 flex space-x-4">
        <button
          onClick={() => setDisplayMode("polygon")}
          className={`px-4 py-2 rounded-md transition ${
            displayMode === "polygon"
              ? "bg-[#2E3192] text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Convert to Polygon
        </button>
        <button
          onClick={() => setDisplayMode("mask")}
          className={`px-4 py-2 rounded-md transition ${
            displayMode === "mask"
              ? "bg-[#2E3192] text-white"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          Convert to Mask
        </button>
      </div>
    </div>
  );
};

export default CanvasControls;
