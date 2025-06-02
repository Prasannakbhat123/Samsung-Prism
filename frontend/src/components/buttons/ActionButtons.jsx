import React from 'react';

const ActionButtons = ({ joinPolygon, onExportPolygons }) => {
  return (
    <div className="mt-4 flex space-x-4">
      <button
        onClick={joinPolygon}
        className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
      >
        Join
      </button>
      <button
        // Explicitly use showUI=true when clicking the View JSON button
        onClick={() => onExportPolygons(true)}
        className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
      >
        View JSON
      </button>
    </div>
  );
};

export default ActionButtons;
