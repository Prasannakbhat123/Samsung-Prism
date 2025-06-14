import React, { useState, useEffect } from "react";
import Tools from "./Tools";
import FolderTree from "./FolderTree";
import Preview from "./Preview";
import PolygonList from "./PolygonList";
import logo from "../assets/IGlogo.png";
import JsonStorageService from "../services/JsonStorageService";
import blobMapper from '../utils/BlobMapper';

const ViewPage = ({ uploadedFiles, setViewMode }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentTool, setCurrentTool] = useState("marker");
  const [polygons, setPolygons] = useState({});
  const [selectedPolygon, setSelectedPolygon] = useState(null);
  const [selectedPolygons, setSelectedPolygons] = useState([]);
  const [fileNames, setFileNames] = useState({});
  const [allPolygons, setAllPolygons] = useState([]);
  const [jsonDataPreview, setJsonDataPreview] = useState(null);
  const [showJsonModal, setShowJsonModal] = useState(false);

  // Enhanced handleFileSelect to load saved polygon data from JSON files
  const handleFileSelect = async (fileUrl, filePath) => {
    // Save current file's polygons before changing
    if (selectedFile && fileNames[selectedFile.url]) {
      const currentPolygons = polygons[selectedFile.url] || [];
      const fileName = fileNames[selectedFile.url];

      if (currentPolygons.length > 0) {
        // Save before switching files
        JsonStorageService.savePolygonData(
          fileName,
          selectedFile.url,
          currentPolygons
        );
        console.log(
          `Saved polygon data for ${fileName} before switching to new file`
        );
      }
    }

    // Log the exact fileUrl being set
    console.log(`Setting selectedFile with url: "${fileUrl}"`);

    // Set the new file
    setSelectedFile({
      url: fileUrl,
      path: filePath,
    });

    // Clear selected polygon when changing files
    setSelectedPolygon(null);

    // Extract file name from path
    let fileName = null;
    if (filePath) {
      fileName = filePath.split("/").pop();
      console.log(`Setting file name for ${fileUrl}: ${fileName}`);
      
      // Update fileNames state
      setFileNames(prev => {
        const newFileNames = {
          ...prev,
          [fileUrl]: fileName,
        };
        
        // IMPORTANT: Share this mapping with window for BlobMapper to access
        window.fileNames = newFileNames;
        
        // Add to BlobMapper directly
        blobMapper.mapFile(fileUrl, fileName);
        
        return newFileNames;
      });
    }

    // Initialize polygons for this file if not already done
    if (!polygons[fileUrl]) {
      setPolygons(prev => ({
        ...prev,
        [fileUrl]: [],  // Explicitly initialize as an empty array
      }));
    }

    // *** NEW CODE: Attempt to load existing polygon data from JSON file ***
    if (fileName) {
      try {
        console.log(`Looking for saved polygons for ${fileName}`);
        const savedData = await JsonStorageService.fetchPolygonData(fileName);

        if (savedData) {
          console.log(`Found saved polygon data for ${fileName}:`, savedData);

          // Convert JSON data to polygon objects
          const loadedPolygons = JsonStorageService.convertJsonToPolygons(
            savedData,
            fileUrl
          );

          if (loadedPolygons.length > 0) {
            console.log(`Loaded ${loadedPolygons.length} polygons for ${fileName}`);

            // Update the polygons state with loaded polygons
            setPolygons(prev => ({
              ...prev,
              [fileUrl]: loadedPolygons,
            }));

            // Also update selected polygons to include loaded ones
            setSelectedPolygons(loadedPolygons);
            setAllPolygons(loadedPolygons);

            // Show success notification
            const notification = document.createElement("div");
            notification.style.position = "fixed";
            notification.style.bottom = "20px";
            notification.style.left = "50%";
            notification.style.transform = "translateX(-50%)";
            notification.style.backgroundColor = "#4CAF50";
            notification.style.color = "white";
            notification.style.padding = "10px 20px";
            notification.style.borderRadius = "5px";
            notification.style.zIndex = "9999";
            notification.textContent = `Loaded ${loadedPolygons.length} saved polygons for ${fileName}`;

            document.body.appendChild(notification);

            setTimeout(() => {
              notification.style.opacity = "0";
              notification.style.transition = "opacity 0.5s";
              setTimeout(() => notification.remove(), 500);
            }, 3000);
          }
        } else {
          console.log(`No saved polygon data found for ${fileName}`);
        }
      } catch (error) {
        console.error(`Error loading saved polygons for ${fileName}:`, error);
      }
    }

    // IMPORTANT: Reset selectedPolygons to only show polygons for the current file
    // This code now runs after loading saved polygons
    const filePolygonsData = polygons[fileUrl] || [];
    
    // Ensure we're working with an array
    if (!Array.isArray(filePolygonsData)) {
      console.warn(`Expected array for polygons[${fileUrl}] but got:`, filePolygonsData);
      // Initialize as empty array if not an array
      setPolygons(prev => ({
        ...prev,
        [fileUrl]: []
      }));
      setSelectedPolygons([]);
      setAllPolygons([]);
      return;
    }
    
    const currentFilePolygons = filePolygonsData.map(p => ({
      ...p,
      fileUrl: fileUrl, // Ensure correct fileUrl
    }));

    // Reset selected polygons to only include current file's polygons
    setSelectedPolygons(currentFilePolygons);

    // Also reset allPolygons the same way
    setAllPolygons(currentFilePolygons);
  };

  const handleProcessPolygons = processedPolygons => {
    if (!selectedFile) return;

    setPolygons(prevPolygons => ({
      ...prevPolygons,
      [selectedFile.url]: processedPolygons,
    }));
  };

  // Add a helper function to ensure we're always working with arrays
  const ensureArray = (value) => {
    if (Array.isArray(value)) return value;
    console.warn("Expected an array but got:", value);
    return [];
  };

  // Helper function to ensure we always have an array of polygons
  const ensurePolygonArray = (data) => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    // If it's a single polygon object, wrap it in an array
    if (typeof data === 'object' && data.points) return [data];
    console.warn("Unknown polygon data format:", data);
    return [];
  };

  // Update handleUpdatePolygons to use the helper
  const handleUpdatePolygons = updatedPolygons => {
    console.log("Updating polygons:", Object.keys(updatedPolygons));

    // Ensure we're maintaining the correct fileUrl for each polygon
    const validatedUpdate = {};

    Object.entries(updatedPolygons).forEach(([fileUrl, filePolygons]) => {
      // Use the helper to ensure we have an array
      validatedUpdate[fileUrl] = ensurePolygonArray(filePolygons).map(poly => {
        // FIX: Ensure fileUrl is set consistently
        const polygonWithFileUrl = {
          ...poly,
          fileUrl: poly.fileUrl || fileUrl,
        };
        console.log(
          `Updated polygon "${polygonWithFileUrl.name}" with fileUrl: ${polygonWithFileUrl.fileUrl}`
        );
        return polygonWithFileUrl;
      });
    });

    // FIX: Update all states to ensure consistency
    setPolygons(prevPolygons => {
      const newPolygons = {
        ...prevPolygons,
        ...validatedUpdate,
      };

      // This will ensure selectedPolygons gets updated immediately rather than waiting for useEffect
      const allPolygonsList = Object.entries(newPolygons).flatMap(
        ([fileUrl, polys]) => {
          // Ensure polys is an array before mapping
          return ensurePolygonArray(polys).map(p => ({ 
            ...p, 
            fileUrl: p.fileUrl || fileUrl 
          }));
        }
      );

      setSelectedPolygons(allPolygonsList);
      setAllPolygons(allPolygonsList);

      return newPolygons;
    });
  };

  // Fix handlePolygonClick to ensure proper fileUrl setting
  const handlePolygonClick = polygon => {
    console.log("Clicked Polygon:", polygon);

    // Ensure the polygon is strictly associated with the current file
    const fileUrl = selectedFile?.url;
    if (!fileUrl) return;

    // Always create a new polygon object with the exact fileUrl
    const normalizedPolygon = {
      ...polygon,
      fileUrl: fileUrl, // Ensure using the exact selectedFile.url
      _timestamp: Date.now(), // Add timestamp to force updates
    };

    console.log(`Normalized polygon with fileUrl: "${fileUrl}"`);

    setPolygons(prevPolygons => {
      const currentPolygons = prevPolygons[fileUrl] || [];
      const updatedPolygons = [...currentPolygons];

      const existingIndex = updatedPolygons.findIndex(
        p => p.name === polygon.name
      );
      if (existingIndex === -1) {
        updatedPolygons.push(normalizedPolygon);
      } else {
        updatedPolygons[existingIndex] = normalizedPolygon;
      }

      return {
        ...prevPolygons,
        [fileUrl]: updatedPolygons,
      };
    });

    // Update other state variables with consistent fileUrl
    setAllPolygons(prev => {
      const existingIndex = prev.findIndex(
        p => p.name === polygon.name && p.fileUrl === fileUrl
      );
      if (existingIndex === -1) {
        return [...prev, normalizedPolygon];
      } else {
        return prev.map((p, index) =>
          index === existingIndex ? normalizedPolygon : p
        );
      }
    });

    setSelectedPolygons(prevSelectedPolygons => {
      const existingIndex = prevSelectedPolygons.findIndex(
        p => p.name === polygon.name && p.fileUrl === fileUrl
      );
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

  // Fix this useEffect that's causing the error
  useEffect(() => {
    if (selectedFile) {
      // Ensure polygons[selectedFile?.url] is an array before calling map
      const filePolygons = polygons[selectedFile?.url];
      
      // Use our helper function
      const safePolygons = ensurePolygonArray(filePolygons);
      
      const processedPolygons = safePolygons.map(polygon => ({
        name: polygon.name,
        group: polygon.group,
        points: polygon.points.map(point => [point.x, point.y]),
      }));

      console.log(
        "Processed Polygons for Current Image:",
        JSON.stringify(processedPolygons, null, 2)
      );
    }
  }, [selectedFile, polygons]);

  // Get all polygons as a flat array for the polygon list
  const getAllPolygons = () => {
    const allPolygons = Object.entries(polygons).flatMap(
      ([fileUrl, filePolygons]) =>
        filePolygons.map(polygon => ({
          ...polygon,
          fileUrl,
        }))
    );

    // Remove duplicates
    const uniquePolygons = allPolygons.filter(
      (polygon, index, self) =>
        index === self.findIndex(p => p.name === polygon.name)
    );

    return uniquePolygons;
  };

  // REMOVE THESE DUPLICATE useEffect HOOKS - They're causing conflicts
  // Delete the following useEffect hook that starts at around line 339
  // useEffect(() => {
  //   const newAllPolygons = Object.entries(polygons).flatMap(
  //     ([fileUrl, filePolygons]) =>
  //       filePolygons.map(polygon => ({ ...polygon, fileUrl }))
  //   );
  //   setAllPolygons(newAllPolygons);
  // }, [polygons]);

  // Only keep the consolidated useEffect hook that handles polygon arrays safely
  useEffect(() => {
    // This single useEffect will handle updating allPolygons whenever polygons change
    console.log("Running consolidated polygon effect");
    
    try {
      // Create a fresh array from all polygons with safe array checks
      const allPolygonList = Object.entries(polygons).flatMap(
        ([fileUrl, filePolygons]) => {
          // Always ensure we have an array before mapping
          if (!filePolygons) return [];
          if (!Array.isArray(filePolygons)) {
            console.warn(`Found non-array value for ${fileUrl}:`, filePolygons);
            // If it's a single polygon object with points, wrap it in an array
            if (typeof filePolygons === 'object' && filePolygons.points) {
              return [{...filePolygons, fileUrl: filePolygons.fileUrl || fileUrl}];
            }
            return [];
          }
          
          // Map each polygon to ensure it has the correct fileUrl
          return filePolygons.map(polygon => ({
            ...polygon,
            fileUrl: polygon.fileUrl || fileUrl
          }));
        }
      );
      
      console.log(`Updated polygon arrays: ${allPolygonList.length} polygons total`);
      
      // Update both state variables in one go to avoid race conditions
      setAllPolygons(allPolygonList);
      setSelectedPolygons(allPolygonList);
    } catch (error) {
      console.error("Error in polygon processing:", error);
      // In case of error, set to empty arrays to avoid crashes
      setAllPolygons([]);
      setSelectedPolygons([]);
    }
  }, [polygons]);

  // Keep the file-specific useEffect but update it to use ensurePolygonArray
  useEffect(() => {
    if (!selectedFile) return;
    
    try {
      // Get the specific file's polygons
      const fileUrl = selectedFile.url;
      const filePolygons = polygons[fileUrl];
      
      // Always ensure we have an array
      const safePolygons = ensurePolygonArray(filePolygons);
      
      // Add the fileUrl to each polygon
      const currentFilePolygons = safePolygons.map(poly => ({
        ...poly,
        fileUrl
      }));
      
      console.log(`File-specific effect: Found ${currentFilePolygons.length} polygons for ${fileUrl}`);
    } catch (error) {
      console.error("Error in file-specific polygon effect:", error);
    }
  }, [selectedFile, polygons]);

  // When you create blob URLs for files, update BlobMapper
  const createBlobURLs = (files) => {
    const fileArray = Array.from(files);
    const urlMapping = {};
    
    const filesWithUrls = fileArray.map(file => {
      const url = URL.createObjectURL(file);
      urlMapping[url] = file.name;
      return { file, url, name: file.name };
    });
    
    // Update BlobMapper with these new mappings
    blobMapper.mapFiles(urlMapping);
    
    return filesWithUrls;
  };

  // Enhanced auto-save effect with more strict filtering and array checking
  useEffect(() => {
    const saveTimeout = setTimeout(() => {
      if (selectedFile?.url && fileNames[selectedFile.url]) {
        const fileUrl = selectedFile.url;

        // Get only polygons that belong to this exact file with strict equality
        // Use ensurePolygonArray to guarantee it's an array
        const imagePolygons = ensurePolygonArray(polygons[fileUrl] || [])
          .filter(p => p.fileUrl === fileUrl);

        const fileName = fileNames[fileUrl];

        if (imagePolygons.length > 0) {
          // Auto-save to JSON file named after the image
          const savedData = JsonStorageService.savePolygonData(
            fileName,
            fileUrl,
            imagePolygons
          );
          console.log(
            `Auto-saved ${imagePolygons.length} polygons for ${fileName}`
          );
        }
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [polygons, selectedFile, fileNames]);

  // Enhance this function to allow silent operation (no UI) for auto-saving
  const viewJsonData = (showUI = true) => {
    if (!selectedFile?.url) {
      if (showUI) alert("Please select a file first");
      return;
    }

    // Extract the actual file name from the URL if not in fileNames
    const fileName = fileNames[selectedFile.url] || selectedFile.url.split('/').pop();
    const imagePolygons = polygons[selectedFile.url] || [];

    if (imagePolygons.length === 0) {
      if (showUI) alert("No polygons to view for this image.");
      return;
    }

    const baseFileName = fileName.split(".")[0];

    // Check if we have data in the local storage first
    let savedData = JsonStorageService.getPolygonData(fileName);

    // If no data found in storage, generate it on the fly from current polygons
    if (!savedData) {
      console.log("No saved data found, generating from current polygons");

      // Format the data directly from current polygons
      savedData = JsonStorageService.formatPolygonData(fileName, imagePolygons);

      // Save it to ensure it's available next time
      JsonStorageService.savePolygonData(
        fileName,
        selectedFile.url,
        imagePolygons
      );
    } else {
      // Force update the saved data with current polygons to ensure latest changes are saved
      JsonStorageService.savePolygonData(
        fileName,
        selectedFile.url,
        imagePolygons
      );
    }

    // Only show modal if showUI is true
    if (showUI) {
      // Show JSON data in modal
      setJsonDataPreview({
        ...savedData,
        jsonFileName: `${baseFileName}.json`,
        path: `${JsonStorageService.jsonFolderPath}${baseFileName}.json`,
      });
      setShowJsonModal(true);
    }

    return savedData;
  };

  // Add a new function specifically for auto-saving
  const forceSaveCurrentJson = () => {
    // Call viewJsonData with showUI set to false for silent operation
    viewJsonData(false);
  };

  const handleEditPolygon = updatedPolygon => {
    if (!selectedFile?.url || !updatedPolygon) return;

    const fileUrl = selectedFile.url;

    // Store original name for reference (to find it in arrays)
    const originalName = updatedPolygon.originalName || updatedPolygon.name;

    // Create an updated polygon with a timestamp to force re-render
    const newPolygon = {
      ...updatedPolygon,
      _timestamp: Date.now(), // Add timestamp to force React to recognize the change
      fileUrl: fileUrl, // Ensure fileUrl is set
    };

    // Update in main polygons state
    setPolygons(prevPolygons => {
      const currentFilePolygons = [...(prevPolygons[fileUrl] || [])];

      // Find by original name
      const polyIndex = currentFilePolygons.findIndex(
        p => p.name === originalName
      );

      if (polyIndex >= 0) {
        currentFilePolygons[polyIndex] = newPolygon;
        console.log(
          `Updated polygon at index ${polyIndex}: ${originalName} → ${newPolygon.name}`
        );
      } else {
        console.warn(
          `Could not find polygon with name "${originalName}" to update`
        );
      }

      return {
        ...prevPolygons,
        [fileUrl]: currentFilePolygons,
      };
    });

    // Update selected polygon if it's the one being edited
    if (selectedPolygon && selectedPolygon.name === originalName) {
      console.log(
        `Updating selected polygon: ${originalName} → ${newPolygon.name}`
      );
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
          console.log(
            `Updated in selectedPolygons: ${p.name} → ${newPolygon.name}`
          );
          return newPolygon;
        }
        return p;
      });
    });

    // Force refresh after a short delay to ensure state updates are processed
    setTimeout(() => {
      console.log("Forced refresh after edit");
      setPolygons(prev => ({ ...prev }));
    }, 100);
  };

  const handleDeletePolygon = polygonToDelete => {
    if (!selectedFile?.url || !polygonToDelete) return;

    const fileUrl = selectedFile.url;
    const polygonName = polygonToDelete.name;

    console.log(`Deleting polygon: ${polygonName} from ${fileUrl}`);

    // First update the main polygons state
    setPolygons(prevPolygons => {
      const currentPolygons = [...(prevPolygons[fileUrl] || [])];
      const filteredPolygons = currentPolygons.filter(
        p => p.name !== polygonName
      );

      console.log(
        `Removed polygon from main state. Before: ${currentPolygons.length}, After: ${filteredPolygons.length}`
      );

      return {
        ...prevPolygons,
        [fileUrl]: filteredPolygons,
      };
    });

    // If the deleted polygon was selected, clear selection
    if (selectedPolygon?.name === polygonName) {
      setSelectedPolygon(null);
    }

    // Remove from allPolygons
    setAllPolygons(prev => {
      const filtered = prev.filter(
        p => !(p.name === polygonName && p.fileUrl === fileUrl)
      );
      console.log(
        `Removed from allPolygons. Before: ${prev.length}, After: ${filtered.length}`
      );
      return filtered;
    });

    // Remove from selectedPolygons
    setSelectedPolygons(prev => {
      const filtered = prev.filter(
        p => !(p.name === polygonName && p.fileUrl === fileUrl)
      );
      console.log(
        `Removed from selectedPolygons. Before: ${prev.length}, After: ${filtered.length}`
      );
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
          <span className="text-xl font-bold text-[#2E3192]">
            Image Segmenter
          </span>
        </div>
        <button
          onClick={() => setViewMode(false)}
          className="border-2 border-[#2E3192] bg-transparent text-[#2E3192] px-4 py-2 rounded-full hover:bg-[#2E3192] hover:text-white transition"
        >
          ← Back
        </button>
      </nav>
      <div className="flex flex-grow">
        <Tools currentTool={currentTool} setCurrentTool={setCurrentTool} />
        <FolderTree files={uploadedFiles} onFileSelect={handleFileSelect} />
        <Preview
          selectedFile={selectedFile?.url}
          currentTool={currentTool}
          onProcessPolygons={handleProcessPolygons}
          onUpdatePolygons={handleUpdatePolygons}
          selectedPolygon={selectedPolygon}
          setSelectedPolygon={setSelectedPolygon}
          onPolygonSelection={handleProcessPolygons}
          selectedPolygons={selectedPolygons}
          // Pass explicit function to control UI visibility
          onExportPolygons={(showUI = true) => viewJsonData(showUI)}
          // Silent save function for when we don't want a popup
          onForceSave={() => viewJsonData(false)}
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
          <div className="bg-white p-6 rounded-lg shadow-xl w-3/4 h-3/4 overflow-auto relative">
            <div className="absolute top-2 right-2">
              <button
                onClick={closeJsonModal}
                className="px-4 py-2 bg-[#2E3192] text-white rounded-md hover:bg-[#1a1c4a]"
              >
                Close
              </button>
            </div>
            <div className="mt-8">
              <h3 className="text-xl text-black font-bold mb-4">
                <span className="text-green-600 mr-2">✓</span>
                JSON File:{" "}
                <span className="text-blue-600">
                  {jsonDataPreview.jsonFileName}
                </span>
              </h3>
              <p className="text-sm text-gray-600 mb-1">
                Path: {jsonDataPreview.path}
              </p>
              <p className="text-sm text-green-600 mb-4 italic">
                This file is automatically updated whenever polygons are created
                or modified.
              </p>

              <div className="mb-4 bg-blue-200 rounded-md">
                <h4 className="text-lg ml-2 text-blue-900 font-semibold">
                  Text Format:
                </h4>
                <pre className="bg-blue-900 p-4 rounded-md overflow-auto max-h-60 text-white">
                  {JsonStorageService.convertToText(jsonDataPreview)}
                </pre>
              </div>

              <div className="mb-4 bg-blue-200 rounded-md">
                <h4 className="text-lg ml-2 text-blue-900 font-semibold">
                  JSON Format:
                </h4>
                <pre className="p-4 bg-blue-900 rounded-md overflow-auto max-h-60 text-white">
                  {JSON.stringify(jsonDataPreview, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewPage;
