import React from 'react';

const ZoomPanControls = ({ 
  zoomLevel, 
  handleZoomIn, 
  handleZoomOut, 
  handleResetZoom, 
  isPanMode 
}) => {
  return (
    <div className="absolute top-2 right-2 bg-white shadow-md rounded-md p-1 z-10">
      <div className="flex items-center">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded-md"
          title="Zoom In"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="11" y1="8" x2="11" y2="14"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded-md"
          title="Zoom Out"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
        </button>
        <button
          onClick={handleResetZoom}
          className="p-2 hover:bg-gray-100 rounded-md"
          title="Reset Zoom and Pan"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 2v6h6"></path>
            <path d="M21 12A9 9 0 0 0 6 5.3L3 8"></path>
            <path d="M21 22v-6h-6"></path>
            <path d="M3 12a9 9 0 0 0 15 6.7l3-2.7"></path>
          </svg>
        </button>
        <div className="px-2 text-sm">
          <span className={isPanMode ? "text-blue-600 font-bold" : ""}>
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default ZoomPanControls;
