import React, { useState, useRef, useEffect } from "react";

const Preview = ({ selectedFile, currentTool, onProcessPolygons, onUpdatePolygons, selectedPolygon, setSelectedPolygon, onPolygonSelection, selectedPolygons, onRedrawCanvas, onExportPolygons }) => {
  const [polygons, setPolygons] = useState({});
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [selectedPointIndex, setSelectedPointIndex] = useState(null);
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [tempPolygon, setTempPolygon] = useState(null);
  const [polygonName, setPolygonName] = useState("");
  const [customName, setCustomName] = useState("");
  const [polygonGroup, setPolygonGroup] = useState("1");
  const [isDraggingPolygon, setIsDraggingPolygon] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [hoveredPolygonIndex, setHoveredPolygonIndex] = useState(null);
  const [isDraggingPoint, setIsDraggingPoint] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const previousFileRef = useRef(null);
  // const [selectedPolygons, setSelectedPolygons] = useState([]);

  // Predefined shape names for dropdown
  const predefinedShapes = ["Rectangle", "Triangle", "Circle", "Hexagon", "Star", "Arrow", "Custom"];
  useEffect(() => {
    if (selectedFile) {
      if (previousFileRef.current !== selectedFile) {
        // Clear current polygon when changing files
        setCurrentPolygon([]);
        setSelectedPolygon(null); // Clear selected polygon when changing files
      }
      
      previousFileRef.current = selectedFile;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = imageRef.current;

      img.onload = () => {
        const parentDiv = canvas.parentElement;
        const parentStyle = window.getComputedStyle(parentDiv);
        const maxWidth = parseInt(parentStyle.width) - 40;
        const maxHeight = parseInt(parentStyle.height) - 80;

        const scale = Math.min(maxWidth / img.width, maxHeight / img.height);

        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;

        // Only draw the image without polygons when changing files
        drawImageOnly();
        // processPolygons();
        redrawCanvas(selectedFile);
      };

      img.src = selectedFile;
    }
  }, [selectedFile, setSelectedPolygon]);

  useEffect(() => {
    if (selectedFile) {
      const currentPolygons = polygons[selectedFile?.url] || [];
      const processedPolygons = currentPolygons.map(polygon => ({
        name: polygon.name,
        group: polygon.group,
        points: polygon.points.map(point => [point.x, point.y])
      }));
  
      // console.log("Processed Polygons for Current Image preview:", JSON.stringify(processedPolygons, null, 2));
    }
  }, [selectedFile, polygons]);
  

  useEffect(() => {
    if (selectedFile) {
      if (selectedPolygon) {
        redrawCanvas(selectedFile);
        redrawSelectedPolygon(selectedPolygon);
      } else {
        redrawCanvas(selectedFile);
      }
    }
  }, [currentPolygon, polygons, selectedFile, selectedPolygon]);

  useEffect(() => {
    // Update local polygon state when selectedPolygons changes or when polygons are edited/deleted
    if (selectedFile) {
      const currentFilePolygons = selectedPolygons.filter(p => p.fileUrl === selectedFile);
      setPolygons(prevPolygons => ({
        ...prevPolygons,
        [selectedFile]: currentFilePolygons
      }));
      
      // Force redraw whenever the polygon data changes
      if (canvasRef.current) {
        redrawCanvas(selectedFile);
      }
    }
  }, [selectedFile, selectedPolygons]);

  // This will catch any changes to the selectedPolygon from the parent (edit/delete operations)
  useEffect(() => {
    if (selectedFile && selectedPolygon) {
      redrawCanvas(selectedFile);
    }
  }, [selectedPolygon]);
  
  // This effect will respond to any changes in the selectedPolygons array
  useEffect(() => {
    if (selectedFile) {
      const currentFilePolygons = selectedPolygons.filter(p => p.fileUrl === selectedFile);
      
      // Update the local polygons state
      setPolygons(prevPolygons => ({
        ...prevPolygons,
        [selectedFile]: currentFilePolygons
      }));
      
      // Force redraw the canvas with the latest data
      if (canvasRef.current) {
        console.log(`Redrawing canvas with ${currentFilePolygons.length} polygons due to selectedPolygons change`);
        redrawCanvas(selectedFile);
      }
    }
  }, [selectedFile, selectedPolygons]);

  // Add an effect specifically for handling polygon edits
  useEffect(() => {
    if (selectedFile && selectedPolygon) {
      console.log(`Selected polygon changed: ${selectedPolygon.name}, redrawing...`);
      redrawCanvas(selectedFile);
    }
  }, [selectedPolygon]);
  
  const drawImageOnly = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  const redrawCanvas = (file) => {
    console.log(`Redrawing Canvas for File: ${file}`);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;
  
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    
    // More robust strict filtering
    // Log all polygons and their fileUrls for debugging
    console.log("All polygons fileUrls:", selectedPolygons.map(p => p.fileUrl));
    
    // Strictly filter polygons to only those belonging to current file
    let currentFilePolygons = selectedPolygons.filter(p => p.fileUrl === file);
    
    // Also check local state for any newly created polygons
    const localPolygons = (polygons[file] || []).map(p => ({...p, fileUrl: file}));
  
    // Ensure we have both new and existing polygons
    currentFilePolygons = [...currentFilePolygons];
  
    // Add any local polygons that might not be in selectedPolygons yet
    localPolygons.forEach(localPoly => {
      if (!currentFilePolygons.some(p => p.name === localPoly.name)) {
        currentFilePolygons.push(localPoly);
      }
    });
    
    console.log(`Drawing ${currentFilePolygons.length} polygons for ${file}`);
    
    // Group colors (matching PolygonList)
    const groupColors = {
      "1": "#FF5733", // Red-orange
      "2": "#33A1FF", // Blue
      "3": "#33FF57", // Green
      "4": "#F033FF", // Purple
      "5": "#FFD700"  // Gold
    };
  
    const getColorForGroup = (group) => {
      return groupColors[group] || "#9C9C9C"; // Default gray if not found
    };
  
    // Draw all polygons for the current file
    currentFilePolygons.forEach((polygon, index) => {
      if (!polygon.points || polygon.points.length < 3) {
        console.warn(`Skipping invalid polygon: ${polygon.name} (insufficient points)`);
        return;
      }
      
      console.log(`Drawing Polygon: ${polygon.name} (Group: ${polygon.group || "1"}) with ${polygon.points.length} points`);
      
      ctx.beginPath();
  
      const scaledPoints = polygon.points.map(point => ({
        x: point.x * scaleX,
        y: point.y * scaleY
      }));
  
      const isSelected = selectedPolygon && selectedPolygon.name === polygon.name;
      const polygonColor = getColorForGroup(polygon.group || "1");
      
      // Highlight selected polygon
      if (isSelected) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Semi-transparent red fill
      } else {
        ctx.strokeStyle = polygonColor;
        // Ensure fill is semi-transparent (0.3 opacity)
        const colorWithoutParens = polygonColor.replace('#', '');
        const r = parseInt(colorWithoutParens.substr(0, 2), 16);
        const g = parseInt(colorWithoutParens.substr(2, 2), 16);
        const b = parseInt(colorWithoutParens.substr(4, 2), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`; // Ensure semi-transparency
      }
  
      ctx.lineWidth = 2;
  
      if (scaledPoints.length > 0) {
        ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
        
        for (let i = 1; i < scaledPoints.length; i++) {
          ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
        }
      }
  
      ctx.closePath();
      ctx.fill();  // Fill the polygon
      ctx.stroke(); // Draw the outline
  
      // Draw points
      scaledPoints.forEach((point) => {
        ctx.beginPath();
        ctx.fillStyle = isSelected ? 'red' : polygonColor;
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
  
      // Draw label and group with polygon color
      if (polygon.name) {
        const firstPoint = scaledPoints[0];
        if (firstPoint) {
          ctx.font = '12px Arial';
          ctx.fillStyle = 'white';
          const textWidth = ctx.measureText(`${polygon.name} (${polygon.group || '1'})`).width;
          const padding = 4;
          const rectWidth = textWidth + padding * 2;
          const rectHeight = 20;
  
          ctx.fillStyle = isSelected ? 'rgba(255, 0, 0, 0.7)' : polygonColor;
          ctx.fillRect(firstPoint.x, firstPoint.y - rectHeight - 5, rectWidth, rectHeight);
  
          ctx.fillStyle = 'white';
          ctx.fillText(`${polygon.name} (${polygon.group || '1'})`, firstPoint.x + padding, firstPoint.y - 10);
        }
      }
    });
  
    // Draw current polygon being created
    if (currentPolygon.length > 0) {
      ctx.beginPath();
      const scaledCurrentPolygon = currentPolygon.map(point => ({
        x: point.x * scaleX,
        y: point.y * scaleY
      }));
  
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.lineWidth = 2;
  
      scaledCurrentPolygon.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
  
      scaledCurrentPolygon.forEach((point) => {
        ctx.beginPath();
        ctx.fillStyle = 'blue';
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
  
      ctx.stroke();
    }
  };


  const redrawSelectedPolygon = (polygon) => {
    const canvas = canvasRef.current;
    if (!canvas || !polygon) return;
    
    // Don't draw if the polygon doesn't belong to current file
    if (polygon.fileUrl !== selectedFile) {
      console.log(`Skipping selected polygon drawing - fileUrl mismatch`);
      return;
    }
    
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    const scaledPoints = polygon.points.map(point => ({
      x: point.x * scaleX,
      y: point.y * scaleY
    }));

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    ctx.lineWidth = 2;

    scaledPoints.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 100, 255, 0.3)';
    ctx.fill();
    ctx.stroke();

    scaledPoints.forEach((point) => {
      ctx.beginPath();
      ctx.fillStyle = 'blue';
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw label and group
    if (polygon.name) {
      const firstPoint = scaledPoints[0];
      ctx.font = '12px Arial';
      ctx.fillStyle = 'white';
      const textWidth = ctx.measureText(`${polygon.name} (${polygon.group})`).width;
      const padding = 4;
      const rectWidth = textWidth + padding * 2;
      const rectHeight = 20;

      ctx.fillStyle = 'rgba(0, 100, 255, 0.7)';
      ctx.fillRect(firstPoint.x, firstPoint.y - rectHeight - 5, rectWidth, rectHeight);

      ctx.fillStyle = 'white';
      ctx.fillText(`${polygon.name} (${polygon.group})`, firstPoint.x + padding, firstPoint.y - 10);
    }
  };

  const reorderPoints = (points) => {
    if (points.length <= 2) return points;

    const remainingPoints = [...points];
    const orderedPoints = [remainingPoints.shift()];

    while (remainingPoints.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remainingPoints.length; i++) {
        const dx = orderedPoints[orderedPoints.length - 1].x - remainingPoints[i].x;
        const dy = orderedPoints[orderedPoints.length - 1].y - remainingPoints[i].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = i;
        }
      }

      orderedPoints.push(remainingPoints.splice(nearestIndex, 1)[0]);
    }

    return orderedPoints;
  };

  // Helper function to check if a point is inside a polygon
  const isPointInPolygon = (x, y, points) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      
      const intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Helper function to find the closest point on a line segment
  const getClosestPointOnLine = (x, y, x1, y1, x2, y2) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return { x: xx, y: yy, distance, param };
  };

  // Helper function to check if a point is near an edge
  const isPointNearEdge = (x, y, points, threshold = 10) => {
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      const result = getClosestPointOnLine(
        x, y, 
        points[i].x, points[i].y, 
        points[j].x, points[j].y
      );
      
      if (result.distance < threshold && result.param > 0 && result.param < 1) {
        return { 
          edgeIndex: i, 
          point: { x: result.x, y: result.y }
        };
      }
    }
    return null;
  };
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'marker') {
      const closeThreshold = 20;

      setCurrentPolygon(prev => {
        const newPolygon = [...prev, { x, y }];

        if (newPolygon.length > 2 &&
          Math.abs(x - newPolygon[0].x) < closeThreshold &&
          Math.abs(y - newPolygon[0].y) < closeThreshold) {
          const finalPolygon = newPolygon.slice(0, -1);
          setTempPolygon(reorderPoints(finalPolygon));
          setShowNamingModal(true);
          return [];
        }
        return newPolygon;
      });
    } else if (currentTool === 'selector') {
      if (isDraggingPoint) {
        setIsDraggingPoint(false);
        return;
      }
      
      const tolerance = 10;
      const currentPolygons = polygons[selectedFile] || [];
      
      // First check if we're clicking on a point
      let pointFound = false;
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        for (let pointIndex = 0; pointIndex < currentPolygons[polyIndex].points.length; pointIndex++) {
          const point = currentPolygons[polyIndex].points[pointIndex];
          if (
            Math.abs(x - point.x) < tolerance &&
            Math.abs(y - point.y) < tolerance
          ) {
            setSelectedPointIndex({ polyIndex, pointIndex });
            setIsDraggingPoint(true);
            pointFound = true;
            break;
          }
        }
        if (pointFound) break;
      }
      
      // If no point was clicked, check if we're clicking on an edge
      if (!pointFound) {
        for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
          const edgeInfo = isPointNearEdge(x, y, currentPolygons[polyIndex].points, tolerance);
          
          if (edgeInfo) {
            // Add a new point on the edge
            const newPoint = edgeInfo.point;
            const newPoints = [...currentPolygons[polyIndex].points];
            newPoints.splice(edgeInfo.edgeIndex + 1, 0, newPoint);
            
            const updatedPolygons = [...currentPolygons];
            updatedPolygons[polyIndex] = {
              ...updatedPolygons[polyIndex],
              points: newPoints
            };
            
            const newPolygons = {
              ...polygons,
              [selectedFile]: updatedPolygons
            };
            
            setPolygons(newPolygons);
            onUpdatePolygons(newPolygons);
            
            // Select the new point for dragging
            setSelectedPointIndex({ polyIndex, pointIndex: edgeInfo.edgeIndex + 1 });
            setIsDraggingPoint(true);
            break;
          }
        }
      }
    } else if (currentTool === 'move') {
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
    } else if (currentTool === 'eraser') {
      const tolerance = 15 * (img.width / canvas.width);
      const updatedPolygons = (polygons[selectedFile] || []).map(polygon => ({
        ...polygon,
        points: polygon.points.filter(point =>
          Math.abs(x - point.x) > tolerance ||
          Math.abs(y - point.y) > tolerance
        )
      })).filter(polygon => polygon.points.length > 2);

      const newPolygons = {
        ...polygons,
        [selectedFile]: updatedPolygons
      };

      setPolygons(newPolygons);
      onUpdatePolygons(newPolygons);
    }
  };

  const handlePolygonSelection = (polygon) => {
    onPolygonSelection(polygon);
    redrawCanvas(selectedFile);
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const img = imageRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'selector') {
      // Change cursor when hovering over points or edges
      const currentPolygons = polygons[selectedFile] || [];
      const tolerance = 10;
      let pointFound = false;
      
      // Check if hovering over a point
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        for (let pointIndex = 0; pointIndex < currentPolygons[polyIndex].points.length; pointIndex++) {
          const point = currentPolygons[polyIndex].points[pointIndex];
          if (
            Math.abs(x - point.x) < tolerance &&
            Math.abs(y - point.y) < tolerance
          ) {
            canvas.style.cursor = 'pointer';
            pointFound = true;
            break;
          }
        }
        if (pointFound) break;
      }
      
      // Check if hovering over an edge
      if (!pointFound) {
        let edgeFound = false;
        for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
          if (isPointNearEdge(x, y, currentPolygons[polyIndex].points, tolerance)) {
            canvas.style.cursor = 'crosshair';
            edgeFound = true;
            break;
          }
        }
        
        if (!edgeFound) {
          canvas.style.cursor = 'default';
        }
      }
      
      // If dragging a point, update its position
      if (isDraggingPoint && selectedPointIndex !== null) {
        const newPolygons = [...(polygons[selectedFile] || [])];
        newPolygons[selectedPointIndex.polyIndex].points[selectedPointIndex.pointIndex] = { x, y };
        const updatedPolygons = {
          ...polygons,
          [selectedFile]: newPolygons
        };
        setPolygons(updatedPolygons);
        onUpdatePolygons(updatedPolygons);
        redrawCanvas(selectedFile);
      }
    } else if (currentTool === 'move') {
      // Check if hovering over a polygon
      const currentPolygons = polygons[selectedFile] || [];
      let foundHover = false;
      
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        if (isPointInPolygon(x, y, currentPolygons[polyIndex].points)) {
          setHoveredPolygonIndex(polyIndex);
          foundHover = true;
          canvas.style.cursor = 'move';
          
          // If we're dragging a polygon, move it
          if (isDraggingPolygon && hoveredPolygonIndex === polyIndex) {
            const newPolygons = [...currentPolygons];
            const dx = x - dragStartPos.x;
            const dy = y - dragStartPos.y;
            
            newPolygons[polyIndex].points = newPolygons[polyIndex].points.map(point => ({
              x: point.x + dx,
              y: point.y + dy
            }));
            
            const updatedPolygons = {
              ...polygons,
              [selectedFile]: newPolygons
            };
            
            setPolygons(updatedPolygons);
            setDragStartPos({ x, y });
            onUpdatePolygons(updatedPolygons);
            redrawCanvas(selectedFile);
          }
          
          break;
        }
      }
      
      if (!foundHover) {
        setHoveredPolygonIndex(null);
        canvas.style.cursor = 'default';
      }
      
      redrawCanvas(selectedFile);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingPoint(false);
    setIsDraggingPolygon(false);
  };
  const processPolygons = () => {
    const processedPolygons = (polygons[selectedFile] || []).map(polygon => ({
      name: polygon.name,
      group: polygon.group,
      points: polygon.points.map(point => [point.x, point.y])
    }));
    
    // Log the processed polygons to the console in JSON format
    console.log(JSON.stringify(processedPolygons, null, 2));
    
    onProcessPolygons(processedPolygons);
  };
  

  const joinPolygon = () => {
    if (currentPolygon.length < 3) return;
    
    const reorderedPoints = reorderPoints(currentPolygon);
    setTempPolygon(reorderedPoints);
    setShowNamingModal(true);
    
    // Pre-fill with reasonable defaults to avoid empty values
    if (!polygonName) setPolygonName(predefinedShapes[0]);
    if (!polygonGroup) setPolygonGroup("1");
  };

  const handleSavePolygon = () => {
    if (!tempPolygon) return;
    
    // Use either the selected predefined shape or the custom name
    const finalName = polygonName === "Custom" ? customName : (polygonName || predefinedShapes[0]);
    
    // Generate unique id to help with tracking
    const uniqueId = Date.now().toString();
    
    // Make absolutely sure points are properly formatted
    const validPoints = tempPolygon.map(point => ({
      x: parseFloat(point.x),
      y: parseFloat(point.y)
    }));
    
    // Ensure proper fileUrl formatting - exact string format
    const newPolygon = {
      name: finalName,
      group: polygonGroup || "1",
      points: validPoints,
      fileUrl: selectedFile, // Strict string format
      id: uniqueId
    };
    
    console.log(`Creating new polygon "${newPolygon.name}" with ID ${uniqueId} for file "${selectedFile}"`);
    
    // Update the local polygons state
    const updatedPolygons = {
      ...polygons,
      [selectedFile]: [...(polygons[selectedFile] || []), newPolygon]
    };

    // Reset UI state
    setCurrentPolygon([]);
    setShowNamingModal(false);
    setPolygonName("");
    setCustomName("");
    setPolygonGroup("1");
    setTempPolygon(null);
    
    // Update local state
    setPolygons(updatedPolygons);
    
    // Notify parent component about the polygon update - this is critical
    // Pass a new object to ensure React detects the change
    onUpdatePolygons({...updatedPolygons});
    
    // Set this polygon as selected so it gets highlighted and included in selectedPolygons
    setSelectedPolygon({...newPolygon});
    
    // Force an update to selectedPolygons in the parent component
    const currentFilePolygons = updatedPolygons[selectedFile] || [];
    const allFilePolygons = currentFilePolygons.map(p => ({...p, fileUrl: selectedFile}));
    
    // FIX: Add redraw calls with delays for UI updates to take effect
    setTimeout(() => {
      console.log("First redraw after polygon join");
      if (canvasRef.current) {
        drawImageOnly(); // First clear the canvas
        redrawCanvas(selectedFile); // Then redraw everything properly
      }
    }, 50);
    
    setTimeout(() => {
      console.log("Second redraw after polygon join");
      if (canvasRef.current) {
        onUpdatePolygons({...updatedPolygons}); // Ping parent component again
        redrawCanvas(selectedFile);
      }
    }, 250);
  };

  // Add a new function to force refresh the polygon data
  const forceRefreshPolygons = () => {
    if (!selectedFile) return;
    
    // Get all polygons from the local state
    const currentPolygons = polygons[selectedFile] || [];
    
    // Force update parent state first
    if (currentPolygons.length > 0) {
      onUpdatePolygons({
        ...polygons,
        [selectedFile]: currentPolygons.map(p => ({...p, fileUrl: selectedFile}))
      });
    }
    
    // Then redraw
    if (canvasRef.current) {
      setTimeout(() => redrawCanvas(selectedFile), 50);
    }
  };

  // Add a new effect to ensure polygons are redrawn when they're created/updated
  useEffect(() => {
    // This effect will handle redrawing the canvas when polygons change
    if (selectedFile && canvasRef.current) {
      console.log("Redrawing canvas due to polygon changes");
      redrawCanvas(selectedFile);
    }
  }, [polygons, selectedFile]);

  return (
    <div className="w-10/12 flex flex-col justify-center items-center bg-[#fff] p-6 shadow-xl">
      {selectedFile ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          <img
            ref={imageRef}
            src={selectedFile}
            alt="Preview"
            className="hidden"
            onLoad={() => drawImageOnly()}
          />
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="max-w-full max-h-full border-4 border-gray-400 rounded-lg shadow-md"
          />
          <div className="mt-4 flex space-x-4">
            <button
              onClick={processPolygons}
              className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
            >
              Process
            </button>
            <button
              onClick={joinPolygon}
              className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
            >
              Join
            </button>
            <button
              onClick={onExportPolygons}
              className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
            >
              View JSON
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[#2E3192] text-lg font-semibold">Select a file to preview</p>
      )}

      {/* Naming Modal */}
      {showNamingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-xl font-bold mb-4">Name Your Polygon</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Select or enter shape name:</label>
              <select 
                className="w-full border border-gray-300 rounded-md p-2 mb-2"
                value={polygonName}
                onChange={(e) => setPolygonName(e.target.value)}
              >
                {predefinedShapes.map((shape, index) => (
                  <option key={index} value={shape}>{shape}</option>
                ))}
              </select>
              {polygonName === "Custom" && (
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
                value={polygonGroup}
                onChange={(e) => setPolygonGroup(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
                placeholder="Enter group ID"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowNamingModal(false);
                  setTempPolygon(null);
                  setPolygonName("");
                  setCustomName("");
                  setPolygonGroup("1");
                }}
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
      )}
    </div>
  );
};

export default Preview;
