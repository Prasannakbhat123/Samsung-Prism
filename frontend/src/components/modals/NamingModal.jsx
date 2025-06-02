import React from 'react';

const NamingModal = ({
  showNamingModal,
  polygonName,
  setPolygonName,
  customName,
  setCustomName,
  polygonGroup,
  setPolygonGroup,
  handleCancelNaming,
  handleSavePolygon,
  allShapeNames
}) => {
  if (!showNamingModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-96">
        <h3 className="text-xl font-bold mb-4">Name Your Polygon</h3>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Select or enter shape name:
          </label>
          <select
            className="w-full border border-gray-300 rounded-md p-2 mb-2"
            value={polygonName}
            onChange={e => setPolygonName(e.target.value)}
          >
            {allShapeNames.map((shape, index) => (
              <option key={index} value={shape}>
                {shape}
              </option>
            ))}
          </select>
          {polygonName === "Custom" && (
            <input
              type="text"
              placeholder="Enter custom shape name"
              className="w-full border border-gray-300 rounded-md p-2"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
            />
          )}
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Group ID:</label>
          <input
            type="text"
            value={polygonGroup}
            onChange={e => setPolygonGroup(e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2"
            placeholder="Enter group ID"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancelNaming}
            className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSavePolygon}
            className="px-4 py-2 bg-[#2E3192] text-white rounded-md hover:bg-[#1a1c4a]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default NamingModal;
