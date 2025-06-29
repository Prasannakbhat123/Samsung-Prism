import React, { useState, useEffect } from 'react';
import JsonStorageService from '../services/JsonStorageService';

const PolygonList = ({ polygons, onPolygonClick, fileNames, selectedFile, selectedPolygon, onEditPolygon, onDeletePolygon }) => {
  const [hoveredPolygonId, setHoveredPolygonId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPolygon, setEditingPolygon] = useState(null);
  const [editName, setEditName] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [customName, setCustomName] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [polygonToDelete, setPolygonToDelete] = useState(null);

  // Predefined shapes for dropdown (matching Preview component)
  const predefinedShapes = ["Rectangle", "Triangle", "Circle", "Hexagon", "Star", "Arrow", "Custom"];

  // Colors for different polygon groups
  const groupColors = {
    "1": "#FF5733", // Red-orange
    "2": "#33A1FF", // Blue
    "3": "#33FF57", // Green
    "4": "#F033FF", // Purple
    "5": "#FFD700"  // Gold
  };

  // Get default color if group doesn't have specific color
  const getColorForGroup = (group) => {
    return groupColors[group] || "#9C9C9C"; // Default gray if not found
  };

  // Filter polygons to only show ones for the selected file with super strict equality check
  const currentFilePolygons = polygons.filter(polygon => {
    const match = polygon.fileUrl === selectedFile;
    
    // Debug non-matching polygons
    if (!match && polygon.fileUrl && selectedFile) {
      console.log(`Not showing polygon "${polygon.name}" because fileUrl mismatch:`, {
        polygonFileUrl: polygon.fileUrl,
        selectedFile: selectedFile
      });
    }
    
    return match;
  });

  const handleEditClick = (polygon, event) => {
    event.stopPropagation();
    
    // Store the original name so we can find it later
    const polygonToEdit = {
      ...polygon,
      originalName: polygon.name // Store original name to identify it later
    };
    
    setEditingPolygon(polygonToEdit);
    setEditName(polygon.name);
    setEditGroup(polygon.group);
    
    // If current name is a custom name, set it
    if (!predefinedShapes.includes(polygon.name)) {
      setEditName("Custom");
      setCustomName(polygon.name);
    } else {
      setCustomName("");
    }
    
    setShowEditModal(true);
  };

  const handleDeleteClick = (polygon, event) => {
    event.stopPropagation();
    setPolygonToDelete(polygon);
    setShowDeleteModal(true);
  };

  // Updated handle delete to trigger save after deletion
  const confirmDelete = () => {
    if (polygonToDelete) {
      onDeletePolygon(polygonToDelete);
      
      // Get file name for the current file to update JSON
      if (selectedFile && fileNames) {
        const fileName = Object.entries(fileNames).find(([url]) => url === selectedFile)?.[1];
        
        if (fileName) {
          // Small delay to ensure state updates happen first
          setTimeout(() => {
            // Find current file's polygons after deletion - strict equality
            const updatedPolygons = polygons.filter(p => 
              p.fileUrl === selectedFile && p.name !== polygonToDelete.name
            );
            
            // Save updated polygon data to JSON
            JsonStorageService.savePolygonData(fileName, selectedFile, updatedPolygons);
            console.log(`Updated JSON for ${fileName} after deleting polygon ${polygonToDelete.name}`);
          }, 100);
        }
      }
      
      setShowDeleteModal(false);
      setPolygonToDelete(null);
    }
  };

  // Updated handle save edit to trigger JSON update after editing
  const handleSaveEdit = () => {
    if (!editingPolygon) return;
    
    const finalName = editName === "Custom" ? customName : editName;
    
    if (!finalName.trim()) {
      alert("Please enter a valid name for the polygon");
      return;
    }
    
    // Keep the originalName reference for identification
    const updatedPolygon = {
      ...editingPolygon,
      name: finalName,
      group: editGroup || "1",
      originalName: editingPolygon.originalName || editingPolygon.name
    };
    
    console.log(`Saving edited polygon: ${editingPolygon.name} → ${finalName} (Group: ${editGroup})`);
    onEditPolygon(updatedPolygon);
    
    // Get file name for the current file to update JSON
    if (selectedFile && fileNames) {
      const fileName = Object.entries(fileNames).find(([url]) => url === selectedFile)?.[1];
      
      if (fileName) {
        // Small delay to ensure state updates happen first
        setTimeout(() => {
          // Find current file's polygons after update
          const currentPolygons = polygons.filter(p => p.fileUrl === selectedFile);
          const updatedPolygons = currentPolygons.map(p => {
            if (p.name === editingPolygon.originalName) {
              return { ...p, name: finalName, group: editGroup || "1" };
            }
            return p;
          });
          
          // Save updated polygon data to JSON
          JsonStorageService.savePolygonData(fileName, selectedFile, updatedPolygons);
          console.log(`Updated JSON for ${fileName} after editing polygon ${finalName}`);
        }, 100);
      }
    }
    
    setShowEditModal(false);
    setEditingPolygon(null);
  };

  return (
    <div className="w-80 bg-gradient-to-b from-gray-900 to-gray-800 border-l border-gray-700 p-6 h-full overflow-hidden shadow-2xl flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Polygons
        </h2>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent mt-3"></div>
      </div>
      
      {/* Polygon List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {currentFilePolygons.length > 0 ? (
          currentFilePolygons.map((polygon, index) => (
            <div 
              key={`${polygon.name}-${index}`} 
              className={`backdrop-blur-sm bg-white/5 border rounded-xl p-4 cursor-pointer transition-all duration-300 hover:bg-white/10 hover:scale-[1.02] hover:shadow-xl ${
                selectedPolygon?.name === polygon.name 
                  ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => onPolygonClick(polygon)}
              onMouseEnter={() => setHoveredPolygonId(`${polygon.name}-${index}`)}
              onMouseLeave={() => setHoveredPolygonId(null)}
            >
              {/* Color indicator */}
              <div 
                className="w-full h-1 rounded-full mb-3"
                style={{ backgroundColor: getColorForGroup(polygon.group) }}
              ></div>
              
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white mb-2 truncate">{polygon.name}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getColorForGroup(polygon.group) }}
                      ></div>
                      <span className="text-sm text-gray-300">Group {polygon.group}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="text-sm text-gray-300">{polygon.points.length} points</span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col space-y-2 ml-3">
                  <button 
                    onClick={(e) => handleEditClick(polygon, e)}
                    className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                    title="Edit Polygon"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteClick(polygon, e)}
                    className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                    title="Delete Polygon"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg font-medium">No polygons created</p>
            <p className="text-gray-600 text-sm mt-1">Start drawing to create polygons</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingPolygon && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Edit Polygon
                  </h3>
                  <p className="text-gray-400 text-sm">Modify polygon properties</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Shape Name Selection */}
              <div className="space-y-3">
                <label className="block text-gray-300 font-medium">Shape Name</label>
                <div className="relative">
                  <select 
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl p-3 text-white focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none transition-all duration-200 appearance-none cursor-pointer"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  >
                    {predefinedShapes.map((shape, index) => (
                      <option key={index} value={shape} className="bg-gray-800 text-white">{shape}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {editName === "Custom" && (
                  <input
                    type="text"
                    placeholder="Enter custom shape name"
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl p-3 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none transition-all duration-200"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                )}
              </div>
              
              {/* Group ID */}
              <div className="space-y-3">
                <label className="block text-gray-300 font-medium">Group ID</label>
                <input
                  type="text"
                  value={editGroup}
                  onChange={(e) => setEditGroup(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl p-3 text-white placeholder-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-500/20 focus:outline-none transition-all duration-200"
                  placeholder="Enter group ID"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-700 bg-gray-900/50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 hover:text-white transition-all duration-200 border border-gray-600 hover:border-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && polygonToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-400">Confirm Deletion</h3>
                  <p className="text-gray-400 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className="text-gray-300 text-lg">
                Are you sure you want to delete the polygon <span className="font-semibold text-white">"{polygonToDelete.name}"</span>?
              </p>
              <p className="text-gray-500 text-sm mt-2">
                This will permanently remove the polygon and all its data.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-700 bg-gray-900/50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setPolygonToDelete(null);
                  }}
                  className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl font-medium hover:bg-gray-700 hover:text-white transition-all duration-200 border border-gray-600 hover:border-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:from-red-500 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Delete Polygon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolygonList;