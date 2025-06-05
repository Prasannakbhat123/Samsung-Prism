//Code 1
import React, { useState, useRef, useEffect } from "react";
import CanvasComponent from "./canvas/CanvasComponent";
import CanvasControls from "./canvas/CanvasControls";
import NamingModal from "./modals/NamingModal";
import ActionButtons from "./buttons/ActionButtons";

import { drawImageOnly, redrawCanvas } from "./canvas/canvasDrawingUtils";
import { isPointInPolygon, isPointNearEdge, findClosestPoint } from "./canvas/canvasHelpers";
import { reorderPoints, adjustPolygonPoints } from "./canvas/PolygonUtilities";

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
  const [zoomLevel, setZoomLevel] = useState(1); // Add zoom state

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
      const ctx = canvas.getContext("2d");
      const img = imageRef.current;

      img.onload = () => {
        const parentDiv = canvasContainerRef.current;
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
  };

  // Handle canvas events with proper zoom coordinate transformation
  const handleCanvasClick = e => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calculate actual scale based on the current canvas size
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    // Calculate mouse position with proper scaling
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Convert to original image coordinates
    const x = canvasX * scaleX;
    const y = canvasY * scaleY;

    if (currentTool === "marker") {
      // Add point to current polygon (no auto-completion)
      setCurrentPolygon(prev => [...prev, { x, y }]);
    } else if (currentTool === "selector") {
      if (isDraggingPoint) {
        setIsDraggingPoint(false);
        return;
      }

      const tolerance = 10;
      const currentPolygons = polygons[selectedFile] || [];

      // First check if we're clicking on a point
      let pointFound = false;

      // Check each polygon for the closest point within tolerance
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        const polygon = currentPolygons[polyIndex];
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
          break;
        }
      }

      // If no point was clicked, check if we're clicking on an edge
      if (!pointFound) {
        // Check if clicking inside a polygon to select it
        for (
          let polyIndex = 0;
          polyIndex < currentPolygons.length;
          polyIndex++
        ) {
          if (isPointInPolygon(x, y, currentPolygons[polyIndex].points)) {
            // Select this polygon
            setSelectedPolygon(currentPolygons[polyIndex]);
            handlePolygonSelection(currentPolygons[polyIndex]);
            return;
          }
        }

        // Then check for edges
        for (
          let polyIndex = 0;
          polyIndex < currentPolygons.length;
          polyIndex++
        ) {
          const edgeInfo = isPointNearEdge(
            x,
            y,
            currentPolygons[polyIndex].points,
            tolerance
          );

          if (edgeInfo) {
            // Select this polygon first
            setSelectedPolygon(currentPolygons[polyIndex]);

            // Add a new point on the edge
            const newPoint = edgeInfo.point;
            const newPoints = [...currentPolygons[polyIndex].points];
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
            break;
          }
        }
      }
    } else if (currentTool === "move") {
      // If we're already dragging a polygon, drop it on click
      if (isDraggingPolygon && hoveredPolygonIndex !== null) {
        setIsDraggingPolygon(false);
        setHoveredPolygonIndex(null);
        return;
      }

      // Otherwise check if we're clicking inside a polygon to start dragging
      const currentPolygons = polygons[selectedFile] || [];
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        if (isPointInPolygon(x, y, currentPolygons[polyIndex].points)) {
          setSelectedPointIndex(null);
          setIsDraggingPolygon(true);
          setDragStartPos({ x, y });
          setHoveredPolygonIndex(polyIndex);
          return;
        }
      }
    } else if (currentTool === "eraser") {
      const tolerance = 15 * (img.width / canvas.width);
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
          redrawCanvas(selectedFile);
          return;
        }
      }

      // Check if we're erasing a point from an existing polygon
      const currentFilePolygons = polygons[selectedFile] || [];

      // Create a copy of the polygons array to modify
      const updatedPolygons = [...currentFilePolygons];

      // Find the polygon and point closest to the click
      let closestPolygonIndex = -1;
      let closestPointIndex = -1;
      let closestDistance = Infinity;

      // Check each polygon for points to erase
      for (let polyIndex = 0; polyIndex < updatedPolygons.length; polyIndex++) {
        const polygon = updatedPolygons[polyIndex];
        const { index, distance } = findClosestPoint(polygon.points, x, y);

        if (
          index !== -1 &&
          distance < closestDistance &&
          distance <= tolerance
        ) {
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
          redrawCanvas(selectedFile);
        } else {
          console.warn(
            "Cannot remove point: polygon must have at least 3 points"
          );
        }
      }
    }
  };

  // Update mouse move handler with the same coordinate transformation
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !selectedFile) return;
    
    const rect = canvas.getBoundingClientRect();

    // Calculate scale based on canvas and image dimensions
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    // Get the center of the canvas
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Calculate mouse position in canvas coordinates
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate position relative to center with zoom correction
    const relativeX = (mouseX - centerX) / zoomLevel + centerX;
    const relativeY = (mouseY - centerY) / zoomLevel + centerY;

    // Convert to original image coordinates
    const x = relativeX * scaleX;
    const y = relativeY * scaleY;

    // Handle point dragging
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
          
          // Redraw canvas with updated point position
          setTimeout(() => {
            if (canvasRef.current && imageRef.current) {
              redrawCanvas(selectedFile, canvasRef.current, imageRef.current, 
                updatedPolygons, currentPolygon, selectedPolygon, displayMode, pointRadius, zoomLevel);
            }
          }, 10);
          
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
            redrawCanvas(selectedFile, canvasRef.current, imageRef.current, 
              updatedPolygons, currentPolygon, selectedPolygon, displayMode, pointRadius, zoomLevel);
          }
        }, 10);
      }
    }
  };

  const handleMouseUp = () => {
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

  // Get all available shape names (predefined + custom)
  const allShapeNames = [
    ...predefinedShapes,
    ...customShapeNames.filter(name => !predefinedShapes.includes(name)),
  ];
  
  return (
    <div
      className="w-10/12 h-full flex flex-col justify-center items-center bg-[#fff] pt-20 px-8 shadow-xl overflow-auto"
      style={{
        msOverflowStyle: "none" /* IE and Edge */,
        scrollbarWidth: "none" /* Firefox */,
        WebkitOverflowScrolling: "touch" /* Smooth scrolling on iOS */,
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
      `}</style>
      {selectedFile ? (
        <div
          ref={canvasContainerRef}
          className="relative w-full h-full flex flex-col items-center justify-center"
          style={{
            aspectRatio: imageSize.width / imageSize.height || 16/9,
            maxHeight: "75vh", // Increased height for better visibility
          }}
        >
          {/* Hidden image for reference */}
          <img
            ref={imageRef}
            src={selectedFile}
            alt="Preview"
            className="hidden"
          />
          
          {/* Canvas component */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="max-w-full max-h-full border-4 border-gray-400 rounded-lg shadow-md"
              style={{ objectFit: "contain" }}
            />
            
            {/* Zoom Controls */}
            <div className="absolute top-2 right-2 bg-white p-2 rounded-md shadow-md flex space-x-2">
              <button 
                onClick={handleZoomIn}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-md text-black border border-gray-300"
                title="Zoom In"
              >
                +
              </button>
              <button 
                onClick={handleZoomOut}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-md text-black border border-gray-300"
                title="Zoom Out"
              >
                -
              </button>
              <button 
                onClick={handleResetZoom}
                className="px-2 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-md text-xs text-black border border-gray-300"
                title="Reset Zoom"
              >
                Reset
              </button>
              <span className="px-1 flex items-center text-sm">
                {Math.round(zoomLevel * 100)}%
              </span>
            </div>
          </div>

          {/* Canvas Controls Section */}
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

          {/* Action Buttons */}
          <ActionButtons 
            joinPolygon={joinPolygon} 
            onExportPolygons={onExportPolygons}
            currentFrame={selectedFile ? parseInt(selectedFile.match(/\d+/)[0]) : null}
            isFirstFrame={selectedFile ? parseInt(selectedFile.match(/\d+/)[0]) === 0 : true}
            selectedFile={selectedFile}
            onUpdatePolygons={setPolygons}
          />
        </div>
      ) : (
        <p className="text-[#2E3192] text-lg font-semibold">
          Select a file to preview
        </p>
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