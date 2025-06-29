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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Name Your Polygon
              </h3>
              <p className="text-gray-400 text-sm">Configure polygon properties</p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Shape Name Selection */}
          <div className="space-y-3">
            <label className="block text-gray-300 font-medium flex items-center">
              <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Shape Name
            </label>
            <div className="relative">
              <select
                className="w-full bg-gray-800 border border-gray-600 rounded-xl p-3 text-white focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
                value={polygonName}
                onChange={e => setPolygonName(e.target.value)}
              >
                {allShapeNames.map((shape, index) => (
                  <option key={index} value={shape} className="bg-gray-800 text-white">
                    {shape}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            {/* Custom Name Input */}
            {polygonName === "Custom" && (
              <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                <input
                  type="text"
                  placeholder="Enter custom shape name"
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl p-3 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none transition-all duration-200"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Group ID */}
          <div className="space-y-3">
            <label className="block text-gray-300 font-medium flex items-center">
              <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Group ID
            </label>
            <input
              type="text"
              value={polygonGroup}
              onChange={e => setPolygonGroup(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl p-3 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none transition-all duration-200"
              placeholder="Enter group ID (e.g., 1, 2, 3...)"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-900/50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleCancelNaming}
              className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 hover:text-white transition-all duration-200 border border-gray-600 hover:border-gray-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePolygon}
              className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl font-medium hover:from-gray-500 hover:to-gray-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Save Polygon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NamingModal;
