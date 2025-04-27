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
    <div className="w-1/4 bg-gray-100 p-4 h-[vh] overflow-y-auto shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-center text-black">Polygons</h2>
      
      {currentFilePolygons.length > 0 ? (
        <div className="mt-2">
          {currentFilePolygons.map((polygon, index) => (
            <div 
              key={`${polygon.name}-${index}`} 
              className={`mb-3 p-3 shadow-md rounded-md cursor-pointer transition-all duration-200
                ${selectedPolygon?.name === polygon.name ? 'border-2 border-blue-500 bg-blue-100' : 'bg-white'}
                ${hoveredPolygonId === `${polygon.name}-${index}` ? 'transform scale-105' : ''}
              `}
              onClick={() => onPolygonClick(polygon)}
              onMouseEnter={() => setHoveredPolygonId(`${polygon.name}-${index}`)}
              onMouseLeave={() => setHoveredPolygonId(null)}
              style={{ borderLeft: `4px solid ${getColorForGroup(polygon.group)}` }}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-md font-semibold text-gray-900">{polygon.name}</h4>
                  <p className="text-sm text-gray-600">Group: {polygon.group}</p>
                  <p className="text-sm text-gray-600">Points: {polygon.points.length}</p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={(e) => handleEditClick(polygon, e)}
                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-700 text-xs"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={(e) => handleDeleteClick(polygon, e)}
                    className="p-1 bg-red-500 text-white rounded hover:bg-red-700 text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-600">No polygons created for this image.</p>
      )}

      {/* Edit Modal */}
      {showEditModal && editingPolygon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-bold mb-4">Edit Polygon</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Select or enter shape name:</label>
              <select 
                className="w-full border border-gray-300 rounded-md p-2 mb-2"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              >
                {predefinedShapes.map((shape, index) => (
                  <option key={index} value={shape}>{shape}</option>
                ))}
              </select>
              {editName === "Custom" && (
                <input
                  type="text"
                  placeholder="Enter custom shape name"
                  className="w-full border border-gray-300 rounded-md p-2"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
              )}
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Group ID:</label>
              <input
                type="text"
                value={editGroup}
                onChange={(e) => setEditGroup(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Enter group ID"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-[#2E3192] text-white rounded-md hover:bg-[#1a1c4a]"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && polygonToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-bold mb-4 text-red-600">Confirm Deletion</h3>
            
            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete the polygon "{polygonToDelete.name}"?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPolygonToDelete(null);
                }}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolygonList;