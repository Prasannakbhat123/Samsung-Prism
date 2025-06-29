//Code 1
import React, { useState, useRef, useEffect } from "react";
import CanvasComponent from "./canvas/CanvasComponent";
import CanvasControls from "./canvas/CanvasControls";
import NamingModal from "./modals/NamingModal";
import ActionButtons from "./buttons/ActionButtons";

import { drawImageOnly, redrawCanvas } from "./canvas/canvasDrawingUtils";
import { isPointInPolygon, isPointNearEdge, findClosestPoint } from "./canvas/canvasHelpers";
import { reorderPoints, adjustPolygonPoints } from "./canvas/PolygonUtilities";
import JsonStorageService from "../services/JsonStorageService";
import blobMapper from "../utils/BlobMapper";

const Preview = ({
  selectedFile,
  currentTool,
  onProcessPolygons,
  onUpdatePolygons,
  selectedPolygon,
  setSelectedPolygon,
  onPolygonSelection,
  selectedPolygons,
  onExportPolygons,
  onForceSave,
}) => {
  // State related to polygons
  const [polygons, setPolygons] = useState({});
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [tempPolygon, setTempPolygon] = useState(null);
  const [isDraggingPolygon, setIsDraggingPolygon] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [hoveredPolygonIndex, setHoveredPolygonIndex] = useState(null);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const [isRitmMode, setIsRitmMode] = useState(false);
  
  // State for polygon naming
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [polygonName, setPolygonName] = useState("");
  const [customName, setCustomName] = useState("");
  const [polygonGroup, setPolygonGroup] = useState("1");
  
  // Display and UI state
  const [pointRadius, setPointRadius] = useState(4); // Default point radius
  const [customShapeNames, setCustomShapeNames] = useState([]); // Store custom shape names
  const [displayMode, setDisplayMode] = useState("polygon"); // "polygon" or "mask"
  const [pointDensity, setPointDensity] = useState(50); // Default point density value
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [lastSelectedPolygonByFile, setLastSelectedPolygonByFile] = useState({});
  const [imageLoadError, setImageLoadError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  // Add pan state
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // References
  const imageRef = useRef(null);
  const canvasRef = useRef(null);
  const previousFileRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Predefined shape names for dropdown
  const predefinedShapes = [
    "Rectangle", "Triangle", "Circle", "Hexagon", "Star", "Arrow", "Custom"
  ];

  // Initialize and handle file changes
  useEffect(() => {
    if (selectedFile) {
      if (previousFileRef.current !== selectedFile) {
        // Reset image error state when changing files
        setImageLoadError(false);

        // Save current selected polygon before changing files
        if (selectedPolygon && previousFileRef.current) {
          setLastSelectedPolygonByFile(prev => ({
            ...prev,
            [previousFileRef.current]: selectedPolygon,
          }));
        }

        // Clear current polygon when changing files
        setCurrentPolygon([]);

        // Try to load polygon data for this file from the server
        const fileName = selectedFile.split(/[/\\]/).pop(); // Extract just filename from path
        
        // Attempt to load polygon data from JSON storage service or backend
        const loadPolygonData = async () => {
          try {
            // First try local storage
            let polygonData = JsonStorageService.getPolygonData(fileName);
            
            // If not found locally, try to fetch from backend
            if (!polygonData) {
              console.log(`Loading polygon data from backend for ${fileName}`);
              polygonData = await JsonStorageService.fetchPolygonData(fileName);
            }
            
            if (polygonData) {
              console.log(`Found polygon data for ${fileName}`);
              // Convert the JSON data to application-ready polygon objects
              const loadedPolygons = JsonStorageService.convertJsonToPolygons(polygonData, selectedFile);
              
              // Update the polygons state with the loaded polygons
              if (loadedPolygons && loadedPolygons.length > 0) {
                setPolygons(prev => ({
                  ...prev,
                  [selectedFile]: loadedPolygons,
                }));
                
                // Notify parent about loaded polygons
                onUpdatePolygons({
                  ...polygons,
                  [selectedFile]: loadedPolygons,
                });
                
                // Set the first polygon as selected
                setSelectedPolygon(loadedPolygons[0]);
              }
            }
          } catch (error) {
            console.error('Error loading polygon data:', error);
          }
        };
        
        loadPolygonData();

        // Restore previously selected polygon for this file if it exists
        const previouslySelectedPolygon = lastSelectedPolygonByFile[selectedFile];
        if (previouslySelectedPolygon) {
          // Find the polygon in the current selectedPolygons array to ensure we have the latest version
          const updatedPolygon = selectedPolygons.find(
            p => p.fileUrl === selectedFile && p.id === previouslySelectedPolygon.id
          );

          if (updatedPolygon) {
            setSelectedPolygon(updatedPolygon);
            // Update point density to match the polygon's point count
            if (updatedPolygon.points && updatedPolygon.points.length) {
              setPointDensity(
                Math.min(100, Math.max(6, updatedPolygon.points.length * 2))
              );
            }
          } else {
            setSelectedPolygon(null);
          }
        } else {
          setSelectedPolygon(null);
        }
      }

      previousFileRef.current = selectedFile;

      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("Canvas reference is null");
        return;
      }
      
      const ctx = canvas.getContext("2d");
      const img = imageRef.current;
      if (!img) {
        console.error("Image reference is null");
        return;
      }

      img.onload = () => {
        const parentDiv = canvasContainerRef.current;
        if (!parentDiv) {
          console.warn("Canvas container reference is null, using default dimensions");
          // Use default dimensions if parent div not available
          canvas.width = img.naturalWidth * 0.8;
          canvas.height = img.naturalHeight * 0.8;
          
          // Store the original image dimensions
          setImageSize({
            width: img.naturalWidth,
            height: img.naturalHeight,
          });
          
          // Draw the image without polygons
          drawImageOnly(canvas, img);
          redrawCanvas(selectedFile, canvas, img, polygons, currentPolygon, selectedPolygon, displayMode, pointRadius, zoomLevel);
          return;
        }
        
        try {
          const parentStyle = window.getComputedStyle(parentDiv);
          
          // Get container dimensions with more space for the image
          const maxWidth = parseInt(parentStyle.width) - 20; // Reduced padding
          const maxHeight = parseInt(parentStyle.height) - 40; // Reduced padding

          // Calculate scale to fit image properly - use 0.95 to make image slightly larger
          const scale = Math.min(
            maxWidth / img.naturalWidth,
            maxHeight / img.naturalHeight
          ) * 0.95; // Increase scale by 5%

          // Store the original image dimensions
          setImageSize({
            width: img.naturalWidth,
            height: img.naturalHeight,
          });

          // Set fixed dimensions for the canvas based on the image aspect ratio
          canvas.width = img.naturalWidth * scale;
          canvas.height = img.naturalHeight * scale;

          // Draw the image without polygons when changing files
          drawImageOnly(canvas, img);
          redrawCanvas(selectedFile, canvas, img, polygons, currentPolygon, selectedPolygon, displayMode, pointRadius, zoomLevel);
        } catch (error) {
          console.error("Error computing canvas dimensions:", error);
          
          // Fallback to default dimensions
          canvas.width = img.naturalWidth * 0.8;
          canvas.height = img.naturalHeight * 0.8;
          
          // Still draw the image
          drawImageOnly(canvas, img);
          redrawCanvas(selectedFile, canvas, img, polygons, currentPolygon, selectedPolygon, displayMode, pointRadius, zoomLevel);
        }
      };

      img.onerror = () => {
        console.error("Failed to load image:", selectedFile);
        setImageLoadError(true);
      };

      img.src = selectedFile;
    }
  }, [selectedFile, selectedPolygons, polygons, currentPolygon, selectedPolygon, displayMode, pointRadius, zoomLevel]);

  // Update local polygon state from selectedPolygons
  useEffect(() => {
    if (selectedFile) {
      const currentFilePolygons = selectedPolygons.filter(
        p => p.fileUrl === selectedFile
      );
      setPolygons(prevPolygons => ({
        ...prevPolygons,
        [selectedFile]: currentFilePolygons,
      }));
    }
  }, [selectedFile, selectedPolygons]);

  // Update point density when selected polygon changes
  useEffect(() => {
    if (selectedPolygon && selectedPolygon.points) {
      // Update point density to match the polygon's point count
      setPointDensity(
        Math.min(100, Math.max(6, selectedPolygon.points.length * 2))
      );
    }
  }, [selectedPolygon]);

  // Function to handle polygon joining
  const joinPolygon = () => {
    if (currentPolygon.length < 3) return;

    const reorderedPoints = reorderPoints(currentPolygon);
    setTempPolygon(reorderedPoints);
    setShowNamingModal(true);

    // Pre-fill with reasonable defaults to avoid empty values
    if (!polygonName) setPolygonName(predefinedShapes[0]);
    if (!polygonGroup) setPolygonGroup("1");
  };

  // Function to handle saving a new polygon
  const handleSavePolygon = () => {
    if (!tempPolygon) return;

    // Use either the selected predefined shape or the custom name
    const finalName =
      polygonName === "Custom"
        ? customName
        : polygonName || predefinedShapes[0];

    // If it's a custom name, add it to the custom shapes list if not already there
    if (
      polygonName === "Custom" &&
      customName &&
      !customShapeNames.includes(customName)
    ) {
      setCustomShapeNames([...customShapeNames, customName]);
    }

    // Generate unique id to help with tracking
    const uniqueId = Date.now().toString();

    // Make absolutely sure points are properly formatted
    const validPoints = tempPolygon.map(point => ({
      x: parseFloat(point.x),
      y: parseFloat(point.y),
    }));

    // Store original points to ensure we never remove them
    const originalPoints = [...validPoints];

    // Ensure proper fileUrl formatting - exact string format
    const newPolygon = {
      name: finalName,
      group: polygonGroup || "1",
      points: validPoints,
      originalPoints: originalPoints, // Store original points
      fileUrl: selectedFile, // Strict string format
      id: uniqueId,
    };

    console.log(
      `Creating new polygon "${newPolygon.name}" with ID ${uniqueId} for file "${selectedFile}"`
    );

    // Update the local polygons state
    const updatedPolygons = {
      ...polygons,
      [selectedFile]: [...(polygons[selectedFile] || []), newPolygon],
    };

    // Reset UI state
    setShowNamingModal(false);
    setPolygonName("");
    setCustomName("");
    setPolygonGroup("1");

    // Update local state
    setPolygons(updatedPolygons);

    // Notify parent component about the polygon update - this is critical
    onUpdatePolygons({...updatedPolygons});

    // Set this polygon as selected so it gets highlighted and included in selectedPolygons
    setSelectedPolygon({...newPolygon});

    // Clear current polygon
    setCurrentPolygon([]);
    setTempPolygon(null);

    // Use onForceSave instead of onExportPolygons to avoid showing the popup
    if (typeof onForceSave === "function") {
      setTimeout(() => onForceSave(), 100);
    }

    // Add redraw calls with delays for UI updates to take effect
    setTimeout(() => {
      console.log("First redraw after polygon join");
      if (canvasRef.current && imageRef.current) {
        drawImageOnly(canvasRef.current, imageRef.current);
        redrawCanvas(selectedFile, canvasRef.current, imageRef.current, updatedPolygons, [], newPolygon, displayMode, pointRadius, zoomLevel);
      }
    }, 50);
  };

  // Function to handle canceling the naming modal
  const handleCancelNaming = () => {
    setShowNamingModal(false);
    setPolygonName("");
    setCustomName("");
    setPolygonGroup("1");
    // Don't clear tempPolygon or currentPolygon to preserve the drawn points
  };

  // Function to handle point density slider change
  const handlePointDensityChange = e => {
    const newDensity = parseInt(e.target.value);
    setPointDensity(newDensity);

    if (selectedPolygon) {
      // Calculate target point count based on density
      const minPoints = 3;
      const maxPoints = 100;
      const targetPointCount = Math.max(
        minPoints,
        Math.min(maxPoints, Math.floor(newDensity / 2))
      );

      // Adjust the selected polygon's points with equidistant distribution
      const updatedPolygon = adjustPolygonPoints(
        selectedPolygon,
        targetPointCount
      );

      // Update the polygons state
      const currentPolygons = [...(polygons[selectedFile] || [])];
      const polyIndex = currentPolygons.findIndex(
        p => p.id === selectedPolygon.id
      );

      if (polyIndex !== -1) {
        currentPolygons[polyIndex] = updatedPolygon;

        const updatedPolygons = {
          ...polygons,
          [selectedFile]: currentPolygons,
        };

        setPolygons(updatedPolygons);
        setSelectedPolygon(updatedPolygon);
        onUpdatePolygons(updatedPolygons);
      }
    }
  };

  // Function to handle point density slider mouseup (when slider is dropped)
  const handlePointDensityMouseUp = () => {
    if (selectedPolygon) {
      // Make the polygon immediately editable by setting it as selected
      setSelectedPolygon({ ...selectedPolygon });
    }
  };

  // Add zoom control functions
  const handleZoomIn = () => {
    setZoomLevel(prevZoom => Math.min(prevZoom * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prevZoom => Math.max(prevZoom / 1.2, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Add panning functions
  const startPan = (e) => {
    // Only start panning when using left mouse button AND either in pan tool OR holding Alt key
    if (e.buttons === 1 && (currentTool === 'pan' || e.altKey)) {
      setIsPanning(true);
      setPanStart({ 
        x: e.clientX, 
        y: e.clientY 
      });
      // Change cursor to indicate active panning
      if (canvasRef.current) {
        canvasRef.current.style.cursor = 'grabbing';
      }
      e.preventDefault();
    }
  };

  const doPan = (e) => {
    // Only pan if actively panning (mouse button pressed down)
    if (isPanning && e.buttons === 1) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setPanStart({ 
        x: e.clientX, 
        y: e.clientY 
      });
      
      // Redraw the canvas with the new pan offset
      if (canvasRef.current && imageRef.current) {
        redrawCanvas(
          selectedFile, 
          canvasRef.current, 
          imageRef.current, 
          polygons, 
          currentPolygon, 
          selectedPolygon, 
          displayMode, 
          pointRadius, 
          zoomLevel,
          { x: panOffset.x + deltaX, y: panOffset.y + deltaY }
        );
      }
    } else if (e.buttons !== 1) {
      // If mouse button is released but isPanning hasn't been updated
      endPan();
    }
  };

  const endPan = () => {
    if (!isPanning) return;
    
    setIsPanning(false);
    // Restore cursor based on current tool
    if (canvasRef.current) {
      if (currentTool === 'pan') {
        canvasRef.current.style.cursor = 'grab';
      } else {
        canvasRef.current.style.cursor = '';
      }
    }
  };

  // Update mouse move handler with proper pan handling
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !selectedFile) return;
    
    // Add the missing rect definition
    const rect = canvas.getBoundingClientRect();
    
    // Set cursor for pan tool but don't activate panning just by hovering
    if (currentTool === 'pan' && !isPanning) {
      canvas.style.cursor = 'grab';
    } else if (isDraggingPoint) {
      // Change cursor when dragging a point
      canvas.style.cursor = 'move';
    }
    
    // Only handle panning if we're already in panning mode (activated by mousedown)
    if (isPanning) {
      doPan(e);
      return;
    }
    
    // Calculate scale based on canvas and image dimensions
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    // Get mouse position in canvas coordinates
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate position with zoom and pan offsets
    const transformedX = (mouseX - panOffset.x) / zoomLevel;
    const transformedY = (mouseY - panOffset.y) / zoomLevel;

    // Convert to original image coordinates
    const x = transformedX * scaleX;
    const y = transformedY * scaleY;

    // Handle point dragging with improved visual feedback
    if (isDraggingPoint && selectedPointIndex && selectedFile) {
      // Update the polygon point
      setPolygons(prevPolygons => {
        const filePolygons = [...(prevPolygons[selectedFile] || [])];
        if (filePolygons[selectedPointIndex.polyIndex] && 
            filePolygons[selectedPointIndex.polyIndex].points) {
          
          filePolygons[selectedPointIndex.polyIndex].points[selectedPointIndex.pointIndex] = { x, y };
          
          const updatedPolygons = {
            ...prevPolygons,
            [selectedFile]: filePolygons,
          };
          
          // Redraw canvas with updated point position - use canvas directly
          redrawCanvas(
            selectedFile, 
            canvas, 
            img, 
            updatedPolygons, 
            currentPolygon, 
            filePolygons[selectedPointIndex.polyIndex], 
            displayMode, 
            pointRadius, 
            zoomLevel,
            panOffset
          );
          
          return updatedPolygons;
        }
        return prevPolygons;
      });
    }
    
    // Handle polygon dragging with move tool
    else if (currentTool === "move" && isDraggingPolygon && hoveredPolygonIndex !== null) {
      const currentPolygons = [...(polygons[selectedFile] || [])];
      if (currentPolygons[hoveredPolygonIndex] && currentPolygons[hoveredPolygonIndex].points) {
        const dx = x - dragStartPos.x;
        const dy = y - dragStartPos.y;
        
        // Update all points of the polygon
        currentPolygons[hoveredPolygonIndex].points = currentPolygons[hoveredPolygonIndex].points.map(point => ({
          x: point.x + dx,
          y: point.y + dy,
        }));
        
        // Update state
        const updatedPolygons = {
          ...polygons,
          [selectedFile]: currentPolygons,
        };
        
        setPolygons(updatedPolygons);
        setDragStartPos({ x, y });
        
        // Redraw canvas
        setTimeout(() => {
          if (canvasRef.current && imageRef.current) {
            redrawCanvas(selectedFile, imageRef.current, 
              updatedPolygons, currentPolygon, selectedPolygon, displayMode, pointRadius, zoomLevel);
          }
        }, 10);
      }
    }
  };

  const handleMouseUp = () => {
    // End panning if active
    if (isPanning) {
      endPan();
    }
    
    // Handle point dragging completion
    if (isDraggingPoint) {
      setIsDraggingPoint(false);
      // Update parent component with updated polygons
      onUpdatePolygons(polygons);
    }
    
    // Handle polygon moving completion
    if (currentTool === "move" && isDraggingPolygon) {
      setIsDraggingPolygon(false);
      // Ensure we update the parent component with the final polygon positions
      onUpdatePolygons(polygons);
      console.log("Move completed - updated polygon positions");
    }
  };

  // Handle canvas events with proper zoom coordinate transformation
  const handleCanvasClick = (e) => {
    // If we're in panning mode, don't handle clicks
    if (isPanning) return;
    
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    
    const rect = canvas.getBoundingClientRect();

    // Calculate scale based on canvas and image dimensions
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    // Get mouse position in canvas coordinates
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Apply inverse transformations for zoom and pan
    const transformedX = (mouseX - panOffset.x) / zoomLevel;
    const transformedY = (mouseY - panOffset.y) / zoomLevel;

    // Convert to original image coordinates
    const x = transformedX * scaleX;
    const y = transformedY * scaleY;

    // If right mouse button, finish point dragging
    if (e.button === 2) {
      // Right click to finish dragging a point
      if (isDraggingPoint) {
        console.log("Finishing point drag with right click");
        setIsDraggingPoint(false);
        onUpdatePolygons(polygons);
        return;
      }
      return; // Skip other processing for right clicks
    }

    // Continue with left-click handling...
    if (currentTool === "marker") {
      // Add point to current polygon (no auto-completion)
      setCurrentPolygon(prev => [...prev, { x, y }]);
      
      // Force immediate redraw to show the new point
      setTimeout(() => {
        if (canvasRef.current && imageRef.current) {
          redrawCanvas(
            selectedFile, 
            canvasRef.current, 
            imageRef.current, 
            polygons, 
            [...currentPolygon, { x, y }], 
            selectedPolygon, 
            displayMode, 
            pointRadius, 
            zoomLevel,
            panOffset
          );
        }
      }, 10);
    } 
    else if (currentTool === "selector") {
      if (isDraggingPoint) {
        setIsDraggingPoint(false);
        return;
      }

      // Increase tolerance for easier edge detection
      const tolerance = 15; // Increased from 10
      // Ensure we have polygons for this file and it's an array
      const filePolygons = polygons[selectedFile];
      const currentPolygons = Array.isArray(filePolygons) ? filePolygons : [];
      
      if (currentPolygons.length === 0) {
        console.log("No polygons found for selection");
        return;
      }

      console.log("Checking for points or edges with tolerance:", tolerance);

      // First check if we're clicking on a point
      let pointFound = false;

      // Check each polygon for the closest point within tolerance
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        const polygon = currentPolygons[polyIndex];
        if (!polygon || !polygon.points || !Array.isArray(polygon.points)) {
          console.warn("Invalid polygon or points at index", polyIndex);
          continue;
        }
        
        try {
          const { index: closestPointIndex, distance } = findClosestPoint(
            polygon.points,
            x,
            y
          );

          if (closestPointIndex !== -1 && distance < tolerance) {
            // Set both the point index and the selected polygon
            setSelectedPointIndex({ polyIndex, pointIndex: closestPointIndex });
            setSelectedPolygon(polygon);
            setIsDraggingPoint(true);
            pointFound = true;
            console.log("Point selected for dragging:", { polyIndex, pointIndex: closestPointIndex });
            break;
          }
        } catch (error) {
          console.error("Error finding closest point:", error);
        }
      }

      // If no point was clicked, check other interactions
      if (!pointFound) {
        try {
          // First check for edges - IMPORTANT: Check edges before checking if inside polygon
          let edgeFound = false;

          for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
            const polygon = currentPolygons[polyIndex];
            if (!polygon || !polygon.points || !Array.isArray(polygon.points)) continue;
            
            // Debug the polygon we're checking
            console.log(`Checking polygon ${polyIndex} with ${polygon.points.length} points for edge near (${x}, ${y})`);
            
            const edgeInfo = isPointNearEdge(
              x,
              y,
              polygon.points,
              tolerance
            );

            if (edgeInfo) {
              edgeFound = true;
              // Select this polygon first
              setSelectedPolygon(polygon);
              console.log("FOUND! Adding point on edge of polygon:", polygon.name, "edge index:", edgeInfo.edgeIndex);

              // Add a new point on the edge
              const newPoint = edgeInfo.point;
              const newPoints = [...polygon.points];
              newPoints.splice(edgeInfo.edgeIndex + 1, 0, newPoint);

              const updatedPolygons = [...currentPolygons];
              updatedPolygons[polyIndex] = {
                ...updatedPolygons[polyIndex],
                points: newPoints,
              };

              const newPolygons = {
                ...polygons,
                [selectedFile]: updatedPolygons,
              };

              setPolygons(newPolygons);
              onUpdatePolygons(newPolygons);

              // Select the new point for dragging
              setSelectedPointIndex({
                polyIndex,
                pointIndex: edgeInfo.edgeIndex + 1,
              });
              setIsDraggingPoint(true);
              
              // Redraw to show the new point immediately
              setTimeout(() => {
                if (canvasRef.current && imageRef.current) {
                  redrawCanvas(
                    selectedFile, 
                    canvasRef.current, 
                    imageRef.current, 
                    newPolygons, 
                    currentPolygon, 
                    updatedPolygons[polyIndex], 
                    displayMode, 
                    pointRadius, 
                    zoomLevel,
                    panOffset
                  );
                }
              }, 10);
              
              break;
            }
          }

          // Only check if point is inside polygon if we didn't find an edge
          if (!edgeFound) {
            // Check if clicking inside a polygon to select it
            for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
              const polygon = currentPolygons[polyIndex];
              if (!polygon || !polygon.points || !Array.isArray(polygon.points)) continue;
              
              if (isPointInPolygon(x, y, polygon.points)) {
                // Select this polygon
                console.log("Selected polygon:", polygon.name);
                setSelectedPolygon(polygon);
                if (typeof onPolygonSelection === 'function') {
                  onPolygonSelection(polygon);
                }
                return;
              }
            }
          }
        } catch (error) {
          console.error("Error in polygon selection:", error);
        }
      }
    } 
    else if (currentTool === "move") {
      // If we're already dragging a polygon, drop it on click
      if (isDraggingPolygon && hoveredPolygonIndex !== null) {
        setIsDraggingPolygon(false);
        setHoveredPolygonIndex(null);
        
        // Force update parent component with the final positions
        onUpdatePolygons(polygons);
        return;
      }

      // Otherwise check if we're clicking inside a polygon to start dragging
      const currentPolygons = polygons[selectedFile] || [];
      
      // Add defensive check to ensure currentPolygons is an array
      if (!Array.isArray(currentPolygons)) {
        console.warn("Expected an array of polygons but got:", currentPolygons);
        return;
      }
      
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        if (!currentPolygons[polyIndex] || !currentPolygons[polyIndex].points) continue;
        
        if (isPointInPolygon(x, y, currentPolygons[polyIndex].points)) {
          // Select the polygon we're moving
          setSelectedPolygon(currentPolygons[polyIndex]);
          setSelectedPointIndex(null);
          setIsDraggingPolygon(true);
          setDragStartPos({ x, y });
          setHoveredPolygonIndex(polyIndex);
          return;
        }
      }
    } 
    else if (currentTool === "eraser") {
      const tolerance = 15 * (img.naturalWidth / canvas.width);
      
      // First check if we need to erase points from the current polygon being drawn
      if (currentPolygon.length > 0) {
        // Find the closest point in the current polygon
        const { index: closestPointIndex, distance } = findClosestPoint(
          currentPolygon,
          x,
          y
        );

        if (closestPointIndex !== -1 && distance <= tolerance) {
          // Remove only this single closest point
          const updatedCurrentPolygon = [...currentPolygon];
          updatedCurrentPolygon.splice(closestPointIndex, 1);
          setCurrentPolygon(updatedCurrentPolygon);
          
          // Force immediate redraw
          setTimeout(() => {
            if (canvasRef.current && imageRef.current) {
              redrawCanvas(
                selectedFile, 
                canvasRef.current, 
                imageRef.current, 
                polygons, 
                updatedCurrentPolygon, 
                selectedPolygon, 
                displayMode, 
                pointRadius, 
                zoomLevel,
                panOffset
              );
            }
          }, 10);
          return;
        }
      }

      // Check if we're erasing a point from an existing polygon
      const currentFilePolygons = polygons[selectedFile] || [];
      if (currentFilePolygons.length === 0) return;

      // Create a copy of the polygons array to modify
      const updatedPolygons = [...currentFilePolygons];

      // Find the polygon and point closest to the click
      let closestPolygonIndex = -1;
      let closestPointIndex = -1;
      let closestDistance = Infinity;

      // Check each polygon for points to erase
      for (let polyIndex = 0; polyIndex < updatedPolygons.length; polyIndex++) {
        const polygon = updatedPolygons[polyIndex];
        if (!polygon || !polygon.points) continue;
        
        const { index, distance } = findClosestPoint(polygon.points, x, y);

        if (index !== -1 && distance < closestDistance && distance <= tolerance) {
          closestDistance = distance;
          closestPolygonIndex = polyIndex;
          closestPointIndex = index;
        }
      }

      // If we found a close point, remove it
      if (closestPolygonIndex !== -1 && closestPointIndex !== -1) {
        const polygon = updatedPolygons[closestPolygonIndex];

        // Only remove the point if there would be at least 3 points left
        if (polygon.points.length > 3) {
          // Create a copy of the points array and remove the point
          const updatedPoints = [...polygon.points];
          updatedPoints.splice(closestPointIndex, 1);

          // Update the polygon with the new points
          updatedPolygons[closestPolygonIndex] = {
            ...polygon,
            points: updatedPoints,
          };

          // Update the polygons state
          const newPolygons = {
            ...polygons,
            [selectedFile]: updatedPolygons,
          };

          setPolygons(newPolygons);
          onUpdatePolygons(newPolygons);
          
          // Force immediate redraw
          setTimeout(() => {
            if (canvasRef.current && imageRef.current) {
              redrawCanvas(
                selectedFile, 
                canvasRef.current, 
                imageRef.current, 
                newPolygons, 
                currentPolygon, 
                selectedPolygon, 
                displayMode, 
                pointRadius, 
                zoomLevel,
                panOffset
              );
            }
          }, 10);
        } else {
          console.warn("Cannot remove point: polygon must have at least 3 points");
        }
      }
    }
  };

  // Get the actual filename for a blob URL
  const getActualFileName = (blobUrl) => {
    return blobMapper.getFilename(blobUrl) || blobUrl.split(/[/\\]/).pop();
  };

  // Extract frame number using the BlobMapper
  const extractFrameNumber = (blobUrl) => {
    return blobMapper.getFrameNumber(blobUrl);
  };

  // Get all available shape names (predefined + custom)
  const allShapeNames = [
    ...predefinedShapes,
    ...customShapeNames.filter(name => !predefinedShapes.includes(name)),
  ];
  
return (
  <div className="flex-1 flex flex-col min-h-0 bg-gradient-to-br from-gray-900 to-gray-800">
    {selectedFile ? (
      <>
        {/* Fixed Canvas Container */}
        <div
          ref={canvasContainerRef}
          className="h-[60vh] flex items-center justify-center p-4 flex-shrink-0"
        >
          {/* Canvas content stays the same */}
          <img ref={imageRef} src={selectedFile} alt="Preview" className="hidden" />
          
          <div className="relative">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onMouseDown={startPan}
              className="border-2 border-gray-600 rounded-xl shadow-2xl bg-gray-900"
              style={{ 
                objectFit: "contain",
                maxWidth: "85vw",
                maxHeight: "55vh"
              }}
            />
            
            {/* Zoom Controls */}
            <div className="absolute top-4 right-4 backdrop-blur-md bg-black/50 border border-gray-700 rounded-xl p-2 shadow-2xl">
              <div className="flex items-center space-x-2">
                <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200" title="Zoom In">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200" title="Zoom Out">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
                  </svg>
                </button>
                <button onClick={handleResetZoom} className="px-3 h-8 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs transition-colors duration-200" title="Reset Zoom">
                  Reset
                </button>
                <div className="px-2 text-xs text-gray-300 font-mono">
                  {Math.round(zoomLevel * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Controls Section */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0">

          <ActionButtons 
            joinPolygon={joinPolygon} 
            onExportPolygons={onExportPolygons}
            currentFrame={selectedFile ? extractFrameNumber(selectedFile) : 0}
            isFirstFrame={selectedFile ? extractFrameNumber(selectedFile) === 0 : true}
            selectedFile={selectedFile}
            onUpdatePolygons={onUpdatePolygons}
            onForceSave={onForceSave}
            onRitmModeChange={setIsRitmMode}
          />

           {!isRitmMode && (
              <CanvasControls 
                imageLoadError={imageLoadError}
                pointRadius={pointRadius}
                setPointRadius={setPointRadius}
                selectedPolygon={selectedPolygon}
                pointDensity={pointDensity}
                handlePointDensityChange={handlePointDensityChange}
                handlePointDensityMouseUp={handlePointDensityMouseUp}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
              />
            )}
        </div>
      </>
    ) : (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-6 text-gray-600">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Image Selected</h3>
          <p className="text-gray-500">Select a file from the explorer to start editing</p>
        </div>
      </div>
    )}

    {/* Naming Modal */}
    <NamingModal
      showNamingModal={showNamingModal}
      polygonName={polygonName}
      setPolygonName={setPolygonName}
      customName={customName}
      setCustomName={setCustomName}
      polygonGroup={polygonGroup}
      setPolygonGroup={setPolygonGroup}
      handleCancelNaming={handleCancelNaming}
      handleSavePolygon={handleSavePolygon}
      allShapeNames={allShapeNames}
    />
  </div>
);

};

export default Preview;