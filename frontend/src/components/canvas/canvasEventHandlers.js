/**
 * Event handlers for canvas interactions
 */

// Handle mouse up events
export const handleMouseUp = (
  endPan,
  setIsDraggingPoint,
  setIsDraggingPolygon,
  currentTool,
  isDraggingPolygon,
  setHoveredPolygonIndex,
  isDraggingPoint,
  selectedFile,
  redrawCanvas,
  polygons,
  onUpdatePolygons,
  hoveredPolygonIndex
) => {
  // End panning if active
  endPan();
  
  // Check if we were dragging a polygon with move tool
  if (currentTool === "move" && isDraggingPolygon && hoveredPolygonIndex !== null && selectedFile) {
    // Make sure to update the parent component with the final polygon state
    if (typeof onUpdatePolygons === 'function' && polygons) {
      onUpdatePolygons(polygons);
      console.log("Updated polygons after move operation", polygons[selectedFile]);
    }
  }

  // Reset dragging states
  setIsDraggingPoint(false);
  setIsDraggingPolygon(false);
  
  // If we're in move tool and were dragging a polygon, reset hover state
  if (currentTool === "move" && isDraggingPolygon) {
    setHoveredPolygonIndex(null);
  }
  
  // If we're in selector tool and finished dragging a point, trigger a redraw
  if (currentTool === "selector" && isDraggingPoint) {
    setTimeout(() => redrawCanvas(selectedFile), 10);
  }
  
  console.log("Mouse up - ended any active dragging operations");
};

// Handle mouse move events
export const handleMouseMove = (
  e,
  canvasRef,
  imageRef,
  selectedFile,
  currentTool,
  polygons,
  currentPolygon,
  isDraggingPoint,
  selectedPointIndex,
  setPolygons,
  onUpdatePolygons,
  redrawCanvas,
  isPointInPolygon,
  isDraggingPolygon,
  hoveredPolygonIndex,
  setHoveredPolygonIndex,
  dragStartPos,
  setDragStartPos,
  findClosestPoint,
  isPanning,
  doPan,
  zoomLevel,
  panOffset
) => {
  const canvas = canvasRef.current;
  if (!canvas || !imageRef.current) return;

  // Handle panning if active
  if (isPanning) {
    doPan(e);
    return;
  }

  // Calculate mouse position with proper scaling and pan/zoom
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;

  // Calculate the scale to fit the image in the canvas
  const scaleX = canvas.width / img.naturalWidth;
  const scaleY = canvas.height / img.naturalHeight;
  const scaleFit = Math.min(scaleX, scaleY);

  // Calculate centered image dimensions at 1x zoom
  const imgWidth = img.naturalWidth * scaleFit;
  const imgHeight = img.naturalHeight * scaleFit;

  // Calculate center position
  const centerX = (canvas.width - imgWidth) / 2;
  const centerY = (canvas.height - imgHeight) / 2;

  // Calculate position in the original zoomed/transformed space
  // Reverse the transformations applied when drawing the image
  const zoomedX = (canvasX - panOffset.x) / zoomLevel;
  const zoomedY = (canvasY - panOffset.y) / zoomLevel;

  // Adjust for the centering translation 
  const translatedX = zoomedX - (canvas.width / 2 / zoomLevel) + (canvas.width / 2 / zoomLevel);
  const translatedY = zoomedY - (canvas.height / 2 / zoomLevel) + (canvas.height / 2 / zoomLevel);

  // Calculate the position relative to the image
  const relativeX = translatedX - centerX;
  const relativeY = translatedY - centerY;

  // Convert to original image coordinates
  const originalX = (relativeX / imgWidth) * img.naturalWidth;
  const originalY = (relativeY / imgHeight) * img.naturalHeight;

  // Check if mouse is within image bounds
  if (relativeX < 0 || relativeY < 0 || relativeX > imgWidth || relativeY > imgHeight) {
    // Mouse outside image bounds
    canvas.style.cursor = "default";
    return;
  }

  const x = originalX;
  const y = originalY;

  // Tool-specific behavior
  if (currentTool === "selector") {
    // Change cursor when hovering over points or edges
    const currentPolygons = polygons[selectedFile] || [];
    const tolerance = 10;
    let pointFound = false;

    // Check if hovering over a point - find the closest one
    for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
      if (!currentPolygons[polyIndex].points) continue;
      
      const { index, distance } = findClosestPoint(
        currentPolygons[polyIndex].points,
        x,
        y
      );

      if (index !== -1 && distance < tolerance) {
        canvas.style.cursor = "pointer";
        pointFound = true;
        break;
      }
    }

    // Check if hovering over an edge
    if (!pointFound) {
      let edgeFound = false;
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        if (!currentPolygons[polyIndex].points) continue;
        
        if (isPointNearEdge(x, y, currentPolygons[polyIndex].points, tolerance)) {
          canvas.style.cursor = "crosshair";
          edgeFound = true;
          break;
        }
      }

      if (!edgeFound) {
        canvas.style.cursor = "default";
      }
    }

    // If dragging a point, update its position
    if (isDraggingPoint && selectedPointIndex !== null) {
      const newPolygons = [...(polygons[selectedFile] || [])];
      
      if (newPolygons[selectedPointIndex.polyIndex] && 
          newPolygons[selectedPointIndex.polyIndex].points && 
          newPolygons[selectedPointIndex.polyIndex].points[selectedPointIndex.pointIndex]) {
        
        newPolygons[selectedPointIndex.polyIndex].points[selectedPointIndex.pointIndex] = { x, y };
        
        const updatedPolygons = {
          ...polygons,
          [selectedFile]: newPolygons,
        };
        
        setPolygons(updatedPolygons);
        onUpdatePolygons(updatedPolygons);
        redrawCanvas(selectedFile);
      }
    }
  } else if (currentTool === "move") {
    // Check if hovering over a polygon
    const currentPolygons = polygons[selectedFile] || [];
    let foundHover = false;

    for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
      if (!currentPolygons[polyIndex] || !currentPolygons[polyIndex].points) {
        continue;
      }
      
      if (isPointInPolygon(x, y, currentPolygons[polyIndex].points)) {
        setHoveredPolygonIndex(polyIndex);
        foundHover = true;
        canvas.style.cursor = "move";
        
        // If we're dragging a polygon, move it
        if (isDraggingPolygon && hoveredPolygonIndex === polyIndex) {
          const newPolygons = [...currentPolygons];
          const dx = x - dragStartPos.x;
          const dy = y - dragStartPos.y;

          // Update all points in the polygon
          newPolygons[polyIndex].points = newPolygons[polyIndex].points.map(point => ({
            x: point.x + dx,
            y: point.y + dy,
          }));

          // If we have original points, update those too to maintain proper reference
          if (newPolygons[polyIndex].originalPoints) {
            newPolygons[polyIndex].originalPoints = newPolygons[polyIndex].originalPoints.map(point => ({
              x: point.x + dx,
              y: point.y + dy,
            }));
          }

          const updatedPolygons = {
            ...polygons,
            [selectedFile]: newPolygons,
          };

          // Make sure we're updating the state with the function
          if (typeof setPolygons === 'function') {
            setPolygons(updatedPolygons);
          }
          
          // Update drag start position for continuous movement
          setDragStartPos({ x, y });
          
          // Notify parent component about the update
          if (typeof onUpdatePolygons === 'function') {
            onUpdatePolygons(updatedPolygons);
          }
          
          // Redraw the canvas with the updated polygon
          redrawCanvas(selectedFile);
        }
        break;
      }
    }

    if (!foundHover) {
      setHoveredPolygonIndex(null);
      canvas.style.cursor = "default";
    }
  } else if (currentTool === "eraser") {
    // Change cursor when hovering over points
    const currentPolygons = polygons[selectedFile] || [];
    const tolerance = 15 * (img.width / canvas.width);
    let pointFound = false;

    // Check if hovering over a point in the current polygon being drawn
    if (currentPolygon.length > 0) {
      const { distance } = findClosestPoint(currentPolygon, x, y);
      if (distance <= tolerance) {
        canvas.style.cursor = "pointer";
        pointFound = true;
      }
    }

    // Check if hovering over a point in existing polygons
    if (!pointFound) {
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        if (!currentPolygons[polyIndex].points) continue;
        
        const { distance } = findClosestPoint(
          currentPolygons[polyIndex].points,
          x,
          y
        );
        
        if (distance <= tolerance) {
          canvas.style.cursor = "pointer";
          pointFound = true;
          break;
        }
      }

      if (!pointFound) {
        canvas.style.cursor = "default";
      }
    }
  } else if (currentTool === "pan") {
    canvas.style.cursor = "grab";
  } else if (currentTool === "marker") {
    canvas.style.cursor = "crosshair";
  }
};

// Handle canvas click events
export const handleCanvasClick = (
  e,
  canvasRef,
  imageRef,
  selectedFile,
  currentTool,
  polygons,
  currentPolygon,
  setCurrentPolygon,
  isDraggingPoint,
  setIsDraggingPoint,
  selectedPointIndex,
  setSelectedPolygon,
  onPolygonSelection,
  hoveredPolygonIndex,
  setHoveredPolygonIndex,
  isDraggingPolygon,
  setIsDraggingPolygon,
  setDragStartPos,
  onUpdatePolygons,
  redrawCanvas,
  isPointInPolygon,
  isPointNearEdge,
  findClosestPoint,
  zoomLevel,
  panOffset
) => {
  if (!canvasRef.current || !imageRef.current || !selectedFile) {
    console.log("Canvas or image reference not available");
    return;
  }
  
  const canvas = canvasRef.current;
  const img = imageRef.current;
  const rect = canvas.getBoundingClientRect();

  console.log("Canvas click detected");
  
  // Calculate mouse position with proper scaling and pan/zoom
  const canvasX = e.clientX - rect.left;
  const canvasY = e.clientY - rect.top;

  // Calculate the scale to fit the image in the canvas
  const scaleX = canvas.width / img.naturalWidth;
  const scaleY = canvas.height / img.naturalHeight;
  const scaleFit = Math.min(scaleX, scaleY);

  // Calculate centered image dimensions at 1x zoom
  const imgWidth = img.naturalWidth * scaleFit;
  const imgHeight = img.naturalHeight * scaleFit;
  
  // Calculate center position
  const centerX = (canvas.width - imgWidth) / 2;
  const centerY = (canvas.height - imgHeight) / 2;
  
  // Apply inverse transformations to get the click position in image space
  
  // 1. Adjust for canvas offset and get position in canvas space
  let x = canvasX;
  let y = canvasY;
  
  // 2. Remove pan offset
  x -= panOffset.x;
  y -= panOffset.y;
  
  // 3. Translate to origin for scaling
  x -= canvas.width / 2;
  y -= canvas.height / 2;
  
  // 4. Remove zoom scaling
  x /= zoomLevel;
  y /= zoomLevel;
  
  // 5. Translate back
  x += canvas.width / 2;
  y += canvas.height / 2;
  
  // 6. Calculate relative to image position and convert to image coordinates
  x = (x - centerX) / imgWidth * img.naturalWidth;
  y = (y - centerY) / imgHeight * img.naturalHeight;
  
  // Check if click is within image bounds
  if (x < 0 || y < 0 || x > img.naturalWidth || y > img.naturalHeight) {
    console.log("Click outside image bounds");
    return; // Click outside image bounds
  }

  console.log(`Canvas click at (${x}, ${y}) in image coordinates`);

  // Tool-specific actions
  if (currentTool === "marker") {
    // Add point to current polygon
    setCurrentPolygon(prev => [...prev, { x, y }]);
    console.log(`Added point at (${x}, ${y}) to current polygon`);
    
    // Force immediate redraw to show the new point
    setTimeout(() => redrawCanvas(selectedFile), 10);
  } 
  else if (currentTool === "selector") {
    // Prevent clicks while dragging
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
      if (!currentPolygons[polyIndex] || !currentPolygons[polyIndex].points) {
        continue;
      }
      
      const { index: closestPointIndex, distance } = findClosestPoint(
        currentPolygons[polyIndex].points,
        x,
        y
      );

      if (closestPointIndex !== -1 && distance < tolerance) {
        // Set both the point index and the selected polygon
        setSelectedPointIndex({ polyIndex, pointIndex: closestPointIndex });
        setSelectedPolygon(currentPolygons[polyIndex]);
        setIsDraggingPoint(true);
        pointFound = true;
        break;
      }
    }

    // If no point was clicked, check if we're clicking inside a polygon
    if (!pointFound) {
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        if (!currentPolygons[polyIndex] || !currentPolygons[polyIndex].points) {
          continue;
        }
        
        if (isPointInPolygon(x, y, currentPolygons[polyIndex].points)) {
          // Select this polygon
          setSelectedPolygon(currentPolygons[polyIndex]);
          if (typeof onPolygonSelection === 'function') {
            onPolygonSelection(currentPolygons[polyIndex]);
          }
          return;
        }
      }

      // Then check for edges
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        if (!currentPolygons[polyIndex] || !currentPolygons[polyIndex].points) {
          continue;
        }
        
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

          // Update polygon state
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
  } 
  else if (currentTool === "move") {
    // If we're already dragging a polygon, drop it on click
    if (isDraggingPolygon && hoveredPolygonIndex !== null) {
      setIsDraggingPolygon(false);
      setHoveredPolygonIndex(null);
      return;
    }

    // Otherwise check if we're clicking inside a polygon to start dragging
    const currentPolygons = polygons[selectedFile] || [];
    for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
      if (!currentPolygons[polyIndex] || !currentPolygons[polyIndex].points) {
        continue;
      }
      
      if (isPointInPolygon(x, y, currentPolygons[polyIndex].points)) {
        setIsDraggingPolygon(true);
        setDragStartPos({ x, y });
        setHoveredPolygonIndex(polyIndex);
        return;
      }
    }
  } 
  else if (currentTool === "eraser") {
    const tolerance = 15 * (img.width / canvas.width);
    
    // Check if we need to erase points from the current polygon being drawn
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
    if (currentFilePolygons.length === 0) return;

    // Create a copy of the polygons array to modify
    const updatedPolygons = [...currentFilePolygons];

    // Find the polygon and point closest to the click
    let closestPolygonIndex = -1;
    let closestPointIndex = -1;
    let closestDistance = Infinity;

    // Check each polygon for points to erase
    for (let polyIndex = 0; polyIndex < updatedPolygons.length; polyIndex++) {
      if (!updatedPolygons[polyIndex] || !updatedPolygons[polyIndex].points) {
        continue;
      }
      
      const polygon = updatedPolygons[polyIndex];
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

        onUpdatePolygons(newPolygons);
        redrawCanvas(selectedFile);
      } else {
        console.warn("Cannot remove point: polygon must have at least 3 points");
      }
    }
  } 
  else if (currentTool === "pan") {
    // Pan tool is handled by the pan functions, not here
    return;
  }
};
