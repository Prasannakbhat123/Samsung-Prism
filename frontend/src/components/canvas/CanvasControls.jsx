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
    <div className="w-full backdrop-blur-sm bg-black/20 border border-gray-700 rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center">
          <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          Canvas Controls
        </h3>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mt-2"></div>
      </div>

      <div className="space-y-6">
        {/* Point Radius Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-gray-300 font-medium flex items-center">
              <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
              </svg>
              Point Radius
            </label>
            <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm font-mono">
              {pointRadius}px
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="1"
              max="10"
              value={pointRadius}
              onChange={e => setPointRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1px</span>
              <span>10px</span>
            </div>
          </div>
        </div>

        {/* Point Density Slider (only show when a polygon is selected) */}
        {selectedPolygon && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-300 font-medium flex items-center">
                <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Point Density
              </label>
              <span className="px-3 py-1 bg-gray-800 text-gray-300 rounded-lg text-sm font-mono">
                {selectedPolygon.points.length} points
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="6"
                max="100"
                value={pointDensity}
                onChange={handlePointDensityChange}
                onMouseUp={handlePointDensityMouseUp}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>6</span>
                <span>100</span>
              </div>
            </div>
          </div>
        )}

        {/* Display Mode Toggle */}
        <div className="space-y-3">
          <label className="text-gray-300 font-medium flex items-center">
            <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Display Mode
          </label>
          <div className="flex space-x-3">
            <button
              onClick={() => setDisplayMode("polygon")}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                displayMode === "polygon"
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg border border-gray-500"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 hover:text-white border border-gray-700 hover:border-gray-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Polygon</span>
            </button>
            <button
              onClick={() => setDisplayMode("mask")}
              className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all duration-300 flex items-center justify-center space-x-2 ${
                displayMode === "mask"
                  ? "bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg border border-gray-500"
                  : "bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 hover:text-white border border-gray-700 hover:border-gray-600"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Mask</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom CSS for slider styling */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6b7280, #4b5563);
          cursor: pointer;
          border: 2px solid #374151;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          background: linear-gradient(135deg, #9ca3af, #6b7280);
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
        }
        
        .slider-thumb::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6b7280, #4b5563);
          cursor: pointer;
          border: 2px solid #374151;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }
        
        .slider-thumb::-moz-range-thumb:hover {
          background: linear-gradient(135deg, #9ca3af, #6b7280);
          transform: scale(1.1);
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
        }
      `}</style>
    </div>
  );
};

export default CanvasControls;
