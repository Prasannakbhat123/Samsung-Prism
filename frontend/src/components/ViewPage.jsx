import React, { useState, useEffect } from "react";
import Tools from "./Tools";
import FolderTree from "./FolderTree";
import Preview from "./Preview";
import PolygonList from "./PolygonList";
import logo from '../assets/IGlogo.png';
import JsonStorageService from "../services/JsonStorageService";

const ViewPage = ({ uploadedFiles, setViewMode }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentTool, setCurrentTool] = useState('marker');
  const [polygons, setPolygons] = useState({});
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [selectedPolygons, setSelectedPolygons] = useState([]);
  const [fileNames, setFileNames] = useState({});
  const [allPolygons, setAllPolygons] = useState([]);
  const [jsonDataPreview, setJsonDataPreview] = useState(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  // Enhanced handleFileSelect to properly handle fileUrl consistency and reset selectedPolygons
  const handleFileSelect = (fileUrl, filePath) => {
    // Save current file's polygons before changing
    if (selectedFile && fileNames[selectedFile.url]) {
      const currentPolygons = polygons[selectedFile.url] || [];
      const fileName = fileNames[selectedFile.url];
      
      if (currentPolygons.length > 0) {
        // Save before switching files
        JsonStorageService.savePolygonData(fileName, selectedFile.url, currentPolygons);
        console.log(`Saved polygon data for ${fileName} before switching to new file`);
      }
    }

    // Log the exact fileUrl being set
    console.log(`Setting selectedFile with url: "${fileUrl}"`);
    
    // Set the new file
    setSelectedFile({
      url: fileUrl,
      path: filePath
    });
    
    // Clear selected polygon when changing files
    setSelectedPolygon(null);
    
    // Initialize polygons for this file if not already done
    if (!polygons[fileUrl]) {
      setPolygons(prev => ({
        ...prev,
        [fileUrl]: []
      }));
    }
  
    // IMPORTANT: Reset selectedPolygons to only show polygons for the current file
    // This fixes the "showing polygons on all images" issue
    const currentFilePolygons = (polygons[fileUrl] || []).map(p => ({
      ...p, 
      fileUrl: fileUrl // Ensure correct fileUrl
    }));
    
    // Reset selected polygons to only include current file's polygons
    setSelectedPolygons(currentFilePolygons);
    
    // Also reset allPolygons the same way
    setAllPolygons(currentFilePolygons);
  
    // Set the file name for the selected file
    if (filePath) {
      const fileName = filePath.split('/').pop();
      console.log(`Setting file name for ${fileUrl}: ${fileName}`);
      setFileNames(prev => ({
        ...prev,
        [fileUrl]: fileName // Extract the file name from the file path
      }));
    }
  };

  const handleProcessPolygons = (processedPolygons) => {
    if (!selectedFile) return;

    setPolygons(prevPolygons => ({
      ...prevPolygons,
      [selectedFile.url]: processedPolygons
    }));
  };

  const handleUpdatePolygons = (updatedPolygons) => {
    console.log("Updating polygons:", Object.keys(updatedPolygons));
    
    // Ensure we're maintaining the correct fileUrl for each polygon
    const validatedUpdate = {};
    
    Object.entries(updatedPolygons).forEach(([fileUrl, filePolygons]) => {
      validatedUpdate[fileUrl] = filePolygons.map(poly => {
        // FIX: Ensure fileUrl is set consistently
        const polygonWithFileUrl = {
          ...poly,
          fileUrl: poly.fileUrl || fileUrl
        };
        console.log(`Updated polygon "${polygonWithFileUrl.name}" with fileUrl: ${polygonWithFileUrl.fileUrl}`);
        return polygonWithFileUrl;
      });
    });
    
    // FIX: Update all states to ensure consistency
    setPolygons(prevPolygons => {
      const newPolygons = {
        ...prevPolygons,
        ...validatedUpdate
      };
      
      // This will ensure selectedPolygons gets updated immediately rather than waiting for useEffect
      const allPolygonsList = Object.entries(newPolygons).flatMap(([fileUrl, polys]) => 
        polys.map(p => ({ ...p, fileUrl: p.fileUrl || fileUrl }))
      );
      
      setSelectedPolygons(allPolygonsList);
      setAllPolygons(allPolygonsList);
      
      return newPolygons;
    });
  };

// Fix handlePolygonClick to ensure proper fileUrl setting
const handlePolygonClick = (polygon) => {
  console.log("Clicked Polygon:", polygon);

  // Ensure the polygon is strictly associated with the current file
  const fileUrl = selectedFile?.url;
  if (!fileUrl) return;
  
  // Always create a new polygon object with the exact fileUrl
  const normalizedPolygon = {
    ...polygon,
    fileUrl: fileUrl, // Ensure using the exact selectedFile.url
    _timestamp: Date.now() // Add timestamp to force updates
  };
  
  console.log(`Normalized polygon with fileUrl: "${fileUrl}"`);

  setPolygons(prevPolygons => {
    const currentPolygons = prevPolygons[fileUrl] || [];
    const updatedPolygons = [...currentPolygons];
    
    const existingIndex = updatedPolygons.findIndex(p => p.name === polygon.name);
    if (existingIndex === -1) {
      updatedPolygons.push(normalizedPolygon);
    } else {
      updatedPolygons[existingIndex] = normalizedPolygon;
    }

    return {
      ...prevPolygons,
      [fileUrl]: updatedPolygons
    };
  });

  // Update other state variables with consistent fileUrl
  setAllPolygons(prev => {
    const existingIndex = prev.findIndex(p => p.name === polygon.name && p.fileUrl === fileUrl);
    if (existingIndex === -1) {
      return [...prev, normalizedPolygon];
    } else {
      return prev.map((p, index) => 
        index === existingIndex ? normalizedPolygon : p
      );
    }
  });

  setSelectedPolygons(prevSelectedPolygons => {
    const existingIndex = prevSelectedPolygons.findIndex(p => p.name === polygon.name && p.fileUrl === fileUrl);
    if (existingIndex === -1) {
      return [...prevSelectedPolygons, normalizedPolygon];
    } else {
      return prevSelectedPolygons.map((p, index) => 
        index === existingIndex ? normalizedPolygon : p
      );
    }
  });

  setSelectedPolygon(normalizedPolygon);
};
  

  useEffect(() => {
    if (selectedFile) {
      const currentPolygons = polygons[selectedFile?.url] || [];
      const processedPolygons = currentPolygons.map(polygon => ({
        name: polygon.name,
        group: polygon.group,
        points: polygon.points.map(point => [point.x, point.y])
      }));

      console.log("Processed Polygons for Current Image:", JSON.stringify(processedPolygons, null, 2));
    }
  }, [selectedFile, polygons]);

  // Get all polygons as a flat array for the polygon list
  const getAllPolygons = () => {
    const allPolygons = Object.entries(polygons).flatMap(([fileUrl, filePolygons]) =>
      filePolygons.map(polygon => ({
        ...polygon,
        fileUrl
      }))
    );

    // Remove duplicates
    const uniquePolygons = allPolygons.filter((polygon, index, self) =>
      index === self.findIndex(p => p.name === polygon.name)
    );

    return uniquePolygons;
  };

  useEffect(() => {
    const newAllPolygons = Object.entries(polygons).flatMap(([fileUrl, filePolygons]) =>
      filePolygons.map(polygon => ({ ...polygon, fileUrl }))
    );
    setAllPolygons(newAllPolygons);
  }, [polygons]);

// Fix the useEffect that updates the allPolygons array
useEffect(() => {
  // Update allPolygons whenever polygons change, ensuring fileUrl is set
  const newAllPolygons = Object.entries(polygons).flatMap(([fileUrl, filePolygons]) =>
    filePolygons.map(polygon => {
      // Ensure consistency by using the file's exact URL
      return { 
        ...polygon, 
        fileUrl: fileUrl // Use the exact fileUrl string
      };
    })
  );
  
  console.log(`Updated allPolygons array: ${newAllPolygons.length} polygons total`);
  
  setAllPolygons(newAllPolygons);
}, [polygons]);

  useEffect(() => {
    // Update allPolygons and selectedPolygons whenever polygons change
    const newAllPolygons = Object.entries(polygons).flatMap(([fileUrl, filePolygons]) => 
      filePolygons.map(polygon => {
        const updatedPolygon = { 
          ...polygon, 
          fileUrl: polygon.fileUrl || fileUrl
        };
        return updatedPolygon;
      })
    );
    
    console.log(`Updated polygon arrays: ${newAllPolygons.length} polygons total`);
    
    setAllPolygons(newAllPolygons);
    setSelectedPolygons(newAllPolygons); // Ensure both arrays have the same data
  }, [polygons]);

// Update the useEffect that handles allPolygons to ensure strict fileUrl
useEffect(() => {
  if (!selectedFile) return;
  
  // This fixes inconsistencies by ensuring only polygons for current file are processed
  const fileUrl = selectedFile.url;
  
  // Get polygons for the current file only
  const currentFilePolygons = (polygons[fileUrl] || []).map(poly => ({
    ...poly,
    fileUrl: fileUrl // Enforce the exact fileUrl string
  }));
  
  // Set these as selectedPolygons when the file changes
  setSelectedPolygons(prevPolygons => {
    // Remove any polygons with this fileUrl (to avoid duplicates)
    const otherFilePolygons = prevPolygons.filter(p => p.fileUrl !== fileUrl);
    
    // Add the current file polygons
    return [...otherFilePolygons, ...currentFilePolygons];
  });
  
  console.log(`Updated selectedPolygons for file "${fileUrl}" with ${currentFilePolygons.length} polygons`);
}, [selectedFile?.url]);

// Enhanced auto-save effect with more strict filtering
useEffect(() => {
  const saveTimeout = setTimeout(() => {
    if (selectedFile?.url && fileNames[selectedFile.url]) {
      const fileUrl = selectedFile.url;
      
      // Get only polygons that belong to this exact file with strict equality
      const imagePolygons = (polygons[fileUrl] || []).filter(p => p.fileUrl === fileUrl);
      
      const fileName = fileNames[fileUrl];
      
      if (imagePolygons.length > 0) {
        // Auto-save to JSON file named after the image
        const savedData = JsonStorageService.savePolygonData(fileName, fileUrl, imagePolygons);
        console.log(`Auto-saved ${imagePolygons.length} polygons for ${fileName}`);
      }
    }
  }, 1000);
  
  return () => clearTimeout(saveTimeout);
}, [polygons, selectedFile, fileNames]);

  const viewJsonData = () => {
    if (!selectedFile?.url) {
      alert("Please select a file first");
      return;
    }
    
    const fileName = fileNames[selectedFile.url] || 'unnamed-file';
    const imagePolygons = polygons[selectedFile.url] || [];
    
    if (imagePolygons.length === 0) {
      alert("No polygons to view for this image.");
      return;
    }
    
    // Get the JSON data that was already saved automatically
    const baseFileName = fileName.split('.')[0];
    const savedData = JsonStorageService.getPolygonData(fileName);
    
    if (!savedData) {
      alert("No saved data found for this image.");
      return;
    }
    
    // Show JSON data in modal
    setJsonDataPreview({
      ...savedData,
      jsonFileName: `${baseFileName}.json`, 
      path: `${JsonStorageService.jsonFolderPath}${baseFileName}.json`
    });
    setShowJsonModal(true);
  };

const handleEditPolygon = (updatedPolygon) => {
  if (!selectedFile?.url || !updatedPolygon) return;
  
  const fileUrl = selectedFile.url;
  
  // Store original name for reference (to find it in arrays)
  const originalName = updatedPolygon.originalName || updatedPolygon.name;
  
  // Create an updated polygon with a timestamp to force re-render
  const newPolygon = {
    ...updatedPolygon,
    _timestamp: Date.now(),  // Add timestamp to force React to recognize the change
    fileUrl: fileUrl         // Ensure fileUrl is set
  };
  
  // Update in main polygons state
  setPolygons(prevPolygons => {
    const currentFilePolygons = [...(prevPolygons[fileUrl] || [])];
    
    // Find by original name
    const polyIndex = currentFilePolygons.findIndex(p => p.name === originalName);
    
    if (polyIndex >= 0) {
      currentFilePolygons[polyIndex] = newPolygon;
      console.log(`Updated polygon at index ${polyIndex}: ${originalName} → ${newPolygon.name}`);
    } else {
      console.warn(`Could not find polygon with name "${originalName}" to update`);
    }
    
    return {
      ...prevPolygons,
      [fileUrl]: currentFilePolygons
    };
  });
  
  // Update selected polygon if it's the one being edited
  if (selectedPolygon && selectedPolygon.name === originalName) {
    console.log(`Updating selected polygon: ${originalName} → ${newPolygon.name}`);
    setSelectedPolygon(newPolygon);
  }
  
  // Update in allPolygons
  setAllPolygons(prev => {
    return prev.map(p => {
      if (p.name === originalName && p.fileUrl === fileUrl) {
        console.log(`Updated in allPolygons: ${p.name} → ${newPolygon.name}`);
        return newPolygon;
      }
      return p;
    });
  });
  
  // Update in selectedPolygons
  setSelectedPolygons(prev => {
    return prev.map(p => {
      if (p.name === originalName && p.fileUrl === fileUrl) {
        console.log(`Updated in selectedPolygons: ${p.name} → ${newPolygon.name}`);
        return newPolygon;
      }
      return p;
    });
  });
  
  // Force refresh after a short delay to ensure state updates are processed
  setTimeout(() => {
    console.log("Forced refresh after edit");
    setPolygons(prev => ({...prev}));
  }, 100);
};

  const handleDeletePolygon = (polygonToDelete) => {
    if (!selectedFile?.url || !polygonToDelete) return;
    
    const fileUrl = selectedFile.url;
    const polygonName = polygonToDelete.name;
    
    console.log(`Deleting polygon: ${polygonName} from ${fileUrl}`);
    
    // First update the main polygons state
    setPolygons(prevPolygons => {
      const currentPolygons = [...(prevPolygons[fileUrl] || [])];
      const filteredPolygons = currentPolygons.filter(p => p.name !== polygonName);
      
      console.log(`Removed polygon from main state. Before: ${currentPolygons.length}, After: ${filteredPolygons.length}`);
      
      return {
        ...prevPolygons,
        [fileUrl]: filteredPolygons
      };
    });
    
    // If the deleted polygon was selected, clear selection
    if (selectedPolygon?.name === polygonName) {
      setSelectedPolygon(null);
    }
    
    // Remove from allPolygons
    setAllPolygons(prev => {
      const filtered = prev.filter(p => !(p.name === polygonName && p.fileUrl === fileUrl));
      console.log(`Removed from allPolygons. Before: ${prev.length}, After: ${filtered.length}`);
      return filtered;
    });
    
    // Remove from selectedPolygons
    setSelectedPolygons(prev => {
      const filtered = prev.filter(p => !(p.name === polygonName && p.fileUrl === fileUrl));
      console.log(`Removed from selectedPolygons. Before: ${prev.length}, After: ${filtered.length}`);
      return filtered;
    });
  };
  
  const closeJsonModal = () => {
    setShowJsonModal(false);
    setJsonDataPreview(null);
  };

  console.log("File Names:", fileNames);

  return (
    <div className="relative flex flex-col h-screen">
      <nav className="flex items-center justify-between bg-gray-200 shadow-2xl text-white p-3">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="Logo" className="h-8" />
          <span className="text-xl font-bold text-[#2E3192]">Image Segmenter</span>
        </div>
        <button 
          onClick={() => setViewMode(false)}
          className="border-2 border-[#2E3192] bg-transparent text-[#2E3192] px-4 py-2 rounded-full hover:bg-[#2E3192] hover:text-white transition"
        >
          ← Back
        </button>
      </nav>
      <div className="flex flex-grow">
        <Tools 
          currentTool={currentTool}
          setCurrentTool={setCurrentTool}
        />
        <FolderTree 
          files={uploadedFiles} 
          onFileSelect={handleFileSelect}
        />
        <Preview 
          selectedFile={selectedFile?.url} 
          currentTool={currentTool}
          onProcessPolygons={handleProcessPolygons}
          onUpdatePolygons={handleUpdatePolygons}
          selectedPolygon={selectedPolygon}
          setSelectedPolygon={setSelectedPolygon}
          onPolygonSelection={handleProcessPolygons}
          selectedPolygons={selectedPolygons} 
          onExportPolygons={viewJsonData}
        />
<PolygonList 
  polygons={allPolygons} 
  onPolygonClick={handlePolygonClick}
  fileNames={fileNames}
  selectedFile={selectedFile?.url}
  selectedPolygon={selectedPolygon} // Pass the selectedPolygon prop
  onEditPolygon={handleEditPolygon}
  onDeletePolygon={handleDeletePolygon}
/>
      </div>
      {/* JSON Data Preview Modal - Updated to reflect that data is already saved */}
      {showJsonModal && jsonDataPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-3/4 h-3/4 overflow-auto">
            <h3 className="text-xl font-bold mb-4">
              <span className="text-green-600 mr-2">✓</span>
              JSON File: <span className="text-blue-600">{jsonDataPreview.jsonFileName}</span>
            </h3>
            <p className="text-sm text-gray-600 mb-1">
              Path: {jsonDataPreview.path}
            </p>
            <p className="text-sm text-green-600 mb-4 italic">
              This file is automatically updated whenever polygons are created or modified.
            </p>
            
            <div className="mb-4">
              <h4 className="text-lg font-semibold">Text Format:</h4>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60">
                {JsonStorageService.convertToText(jsonDataPreview)}
              </pre>
            </div>
            
            <div className="mb-4">
              <h4 className="text-lg font-semibold">JSON Format:</h4>
              <pre className="bg-gray-100 p-4 rounded-md overflow-auto max-h-60">
                {JSON.stringify(jsonDataPreview, null, 2)}
              </pre>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={closeJsonModal}
                className="px-4 py-2 bg-[#2E3192] text-white rounded-md hover:bg-[#1a1c4a]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewPage;