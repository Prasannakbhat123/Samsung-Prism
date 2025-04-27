//Code 1
import React, { useState, useRef, useEffect } from "react";

const Preview = ({
  selectedFile,
  currentTool,
  onProcessPolygons,
  onUpdatePolygons,
  selectedPolygon,
  setSelectedPolygon,
  onPolygonSelection,
  selectedPolygons,
  onRedrawCanvas,
  onExportPolygons,
  onForceSave,
}) => {
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
  const [pointRadius, setPointRadius] = useState(4); // Default point radius
  const [customShapeNames, setCustomShapeNames] = useState([]); // Store custom shape names
  const [displayMode, setDisplayMode] = useState("polygon"); // "polygon" or "mask"
  const [pointDensity, setPointDensity] = useState(50); // Default point density value
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [lastSelectedPolygonByFile, setLastSelectedPolygonByFile] = useState(
    {}
  ); // Store selected polygon for each file

  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const previousFileRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Predefined shape names for dropdown
  const predefinedShapes = [
    "Rectangle",
    "Triangle",
    "Circle",
    "Hexagon",
    "Star",
    "Arrow",
    "Custom",
  ];

  useEffect(() => {
    if (selectedFile) {
      if (previousFileRef.current !== selectedFile) {
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
        const previouslySelectedPolygon =
          lastSelectedPolygonByFile[selectedFile];
        if (previouslySelectedPolygon) {
          // Find the polygon in the current selectedPolygons array to ensure we have the latest version
          const updatedPolygon = selectedPolygons.find(
            p =>
              p.fileUrl === selectedFile &&
              p.id === previouslySelectedPolygon.id
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
        const maxWidth = parseInt(parentStyle.width) - 40;
        const maxHeight = parseInt(parentStyle.height) - 80;

        const scale = Math.min(
          maxWidth / img.naturalWidth,
          maxHeight / img.naturalHeight
        );

        // Store the original image dimensions
        setImageSize({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });

        // Set fixed dimensions for the canvas based on the image aspect ratio
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;

        // Only draw the image without polygons when changing files
        drawImageOnly();
        redrawCanvas(selectedFile);
      };

      img.src = selectedFile;
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

  useEffect(() => {
    if (selectedFile) {
      const currentPolygons = polygons[selectedFile] || [];
      const processedPolygons = currentPolygons.map(polygon => ({
        name: polygon.name,
        group: polygon.group,
        points: polygon.points.map(point => [point.x, point.y]),
      }));
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
  }, [
    currentPolygon,
    polygons,
    selectedFile,
    selectedPolygon,
    displayMode,
    pointRadius,
  ]);

  useEffect(() => {
    // Update local polygon state when selectedPolygons changes or when polygons are edited/deleted
    if (selectedFile) {
      const currentFilePolygons = selectedPolygons.filter(
        p => p.fileUrl === selectedFile
      );
      setPolygons(prevPolygons => ({
        ...prevPolygons,
        [selectedFile]: currentFilePolygons,
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
      const currentFilePolygons = selectedPolygons.filter(
        p => p.fileUrl === selectedFile
      );

      // Update the local polygons state
      setPolygons(prevPolygons => ({
        ...prevPolygons,
        [selectedFile]: currentFilePolygons,
      }));

      // Force redraw the canvas with the latest data
      if (canvasRef.current) {
        console.log(
          `Redrawing canvas with ${currentFilePolygons.length} polygons due to selectedPolygons change`
        );
        redrawCanvas(selectedFile);
      }
    }
  }, [selectedFile, selectedPolygons]);

  // Add an effect specifically for handling polygon edits
  useEffect(() => {
    if (selectedFile && selectedPolygon) {
      console.log(
        `Selected polygon changed: ${selectedPolygon.name}, redrawing...`
      );
      redrawCanvas(selectedFile);

      // Store this selection in our tracking object
      setLastSelectedPolygonByFile(prev => ({
        ...prev,
        [selectedFile]: selectedPolygon,
      }));
    }
  }, [selectedPolygon]);

  // Add window resize handler to maintain canvas size
  useEffect(() => {
    const handleResize = () => {
      if (
        selectedFile &&
        canvasRef.current &&
        imageRef.current &&
        canvasContainerRef.current
      ) {
        const canvas = canvasRef.current;
        const img = imageRef.current;
        const parentDiv = canvasContainerRef.current;
        const parentStyle = window.getComputedStyle(parentDiv);
        const maxWidth = parseInt(parentStyle.width) - 40;
        const maxHeight = parseInt(parentStyle.height) - 80;

        const scale = Math.min(
          maxWidth / img.naturalWidth,
          maxHeight / img.naturalHeight
        );

        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;

        redrawCanvas(selectedFile);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [selectedFile]);

  const drawImageOnly = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  const redrawCanvas = file => {
    console.log(`Redrawing Canvas for File: ${file}`);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

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

    // Group colors
    const groupColors = {
      1: "#FF5733", // Red-orange
      2: "#33A1FF", // Blue
      3: "#33FF57", // Green
      4: "#F033FF", // Purple
      5: "#FFD700", // Gold
    };

    const getColorForGroup = group => {
      return groupColors[group] || "#9C9C9C"; // Default gray if not found
    };

    // Draw all polygons for the current file
    currentFilePolygons.forEach((polygon, index) => {
      if (!polygon.points || polygon.points.length < 3) {
        console.warn(
          `Skipping invalid polygon: ${polygon.name} (insufficient points)`
        );
        return;
      }

      ctx.beginPath();

      const scaledPoints = polygon.points.map(point => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }));

      const isSelected =
        selectedPolygon && selectedPolygon.name === polygon.name;
      const polygonColor = getColorForGroup(polygon.group || "1");

      if (isSelected) {
        ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      } else {
        ctx.strokeStyle = polygonColor;
        const colorWithoutParens = polygonColor.replace("#", "");
        const r = parseInt(colorWithoutParens.substr(0, 2), 16);
        const g = parseInt(colorWithoutParens.substr(2, 2), 16);
        const b = parseInt(colorWithoutParens.substr(4, 2), 16);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
      }

      ctx.lineWidth = 2;

      if (scaledPoints.length > 0) {
        ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y);
        for (let i = 1; i < scaledPoints.length; i++) {
          ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y);
        }
      }

      ctx.closePath();
      ctx.fill();

      // Only draw stroke in polygon mode
      if (displayMode === "polygon") {
        ctx.stroke();
      }

      // Always draw points for selected polygon, otherwise only in polygon mode
      if (displayMode === "polygon" || isSelected) {
        scaledPoints.forEach(point => {
          ctx.beginPath();
          ctx.fillStyle = isSelected ? "red" : polygonColor;
          ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw label and group with polygon color (only in polygon mode)
      if (polygon.name && displayMode === "polygon") {
        const firstPoint = scaledPoints[0];
        if (firstPoint) {
          ctx.font = "12px Arial";
          ctx.fillStyle = "white";
          const textWidth = ctx.measureText(
            `${polygon.name} (${polygon.group || "1"})`
          ).width;
          const padding = 4;
          const rectWidth = textWidth + padding * 2;
          const rectHeight = 20;

          ctx.fillStyle = isSelected ? "rgba(255, 0, 0, 0.7)" : polygonColor;
          ctx.fillRect(
            firstPoint.x,
            firstPoint.y - rectHeight - 5,
            rectWidth,
            rectHeight
          );

          ctx.fillStyle = "white";
          ctx.fillText(
            `${polygon.name} (${polygon.group || "1"})`,
            firstPoint.x + padding,
            firstPoint.y - 10
          );
        }
      }
    });

    // Draw current polygon being created
    if (currentPolygon.length > 0) {
      ctx.beginPath();
      const scaledCurrentPolygon = currentPolygon.map(point => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }));

      ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
      ctx.lineWidth = 2;

      scaledCurrentPolygon.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });

      // Always show points for the polygon being created
      scaledCurrentPolygon.forEach(point => {
        ctx.beginPath();
        ctx.fillStyle = "blue";
        ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.stroke();
    }
  };

  const redrawSelectedPolygon = polygon => {
    const canvas = canvasRef.current;
    if (!canvas || !polygon) return;

    // Don't draw if the polygon doesn't belong to current file
    if (polygon.fileUrl !== selectedFile) {
      console.log(`Skipping selected polygon drawing - fileUrl mismatch`);
      return;
    }

    const ctx = canvas.getContext("2d");
    const img = imageRef.current;

    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;

    const scaledPoints = polygon.points.map(point => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }));

    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 0, 0, 0.7)";
    ctx.lineWidth = 2;

    scaledPoints.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.closePath();
    ctx.fillStyle = "rgba(0, 100, 255, 0.3)";
    ctx.fill();
    ctx.stroke();

    // Draw points only if in polygon mode
    if (displayMode === "polygon") {
      scaledPoints.forEach(point => {
        ctx.beginPath();
        ctx.fillStyle = "blue";
        ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // Draw label and group
    if (polygon.name) {
      const firstPoint = scaledPoints[0];
      ctx.font = "12px Arial";
      ctx.fillStyle = "white";
      const textWidth = ctx.measureText(
        `${polygon.name} (${polygon.group})`
      ).width;
      const padding = 4;
      const rectWidth = textWidth + padding * 2;
      const rectHeight = 20;

      ctx.fillStyle = "rgba(0, 100, 255, 0.7)";
      ctx.fillRect(
        firstPoint.x,
        firstPoint.y - rectHeight - 5,
        rectWidth,
        rectHeight
      );

      ctx.fillStyle = "white";
      ctx.fillText(
        `${polygon.name} (${polygon.group})`,
        firstPoint.x + padding,
        firstPoint.y - 10
      );
    }
  };

  const reorderPoints = points => {
    if (points.length <= 2) return points;

    const remainingPoints = [...points];
    const orderedPoints = [remainingPoints.shift()];

    while (remainingPoints.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Infinity;

      for (let i = 0; i < remainingPoints.length; i++) {
        const dx =
          orderedPoints[orderedPoints.length - 1].x - remainingPoints[i].x;
        const dy =
          orderedPoints[orderedPoints.length - 1].y - remainingPoints[i].y;
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
      const xi = points[i].x,
        yi = points[i].y;
      const xj = points[j].x,
        yj = points[j].y;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
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
        x,
        y,
        points[i].x,
        points[i].y,
        points[j].x,
        points[j].y
      );

      if (result.distance < threshold && result.param > 0 && result.param < 1) {
        return {
          edgeIndex: i,
          point: { x: result.x, y: result.y },
        };
      }
    }
    return null;
  };

  // Calculate the perimeter of a polygon
  const calculatePerimeter = points => {
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const nextIndex = (i + 1) % points.length;
      const dx = points[nextIndex].x - points[i].x;
      const dy = points[nextIndex].y - points[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    return perimeter;
  };

  // Generate equidistant points along the boundary of a polygon
  const generateEquidistantPoints = (polygon, targetPointCount) => {
    if (!polygon || !polygon.points || polygon.points.length < 3)
      return polygon;

    // Store original vertices if not already stored
    if (!polygon.originalPoints) {
      polygon.originalPoints = [...polygon.points];
    }

    const originalPoints = [...polygon.originalPoints];

    // Don't reduce below original point count
    const minPointCount = originalPoints.length;
    if (targetPointCount <= minPointCount) {
      return { ...polygon, points: originalPoints };
    }

    // Calculate the total perimeter
    const perimeter = calculatePerimeter(originalPoints);

    // Calculate the distance between points
    const segmentLength = perimeter / targetPointCount;

    // Generate new points
    const newPoints = [];
    let currentPoint = originalPoints[0];
    newPoints.push({ ...currentPoint });

    let remainingDistance = segmentLength;
    let currentIndex = 0;

    while (newPoints.length < targetPointCount) {
      const nextIndex = (currentIndex + 1) % originalPoints.length;
      const nextPoint = originalPoints[nextIndex];

      // Calculate distance to next original point
      const dx = nextPoint.x - currentPoint.x;
      const dy = nextPoint.y - currentPoint.y;
      const segmentDistance = Math.sqrt(dx * dx + dy * dy);

      if (segmentDistance < remainingDistance) {
        // Move to next original point
        currentPoint = nextPoint;
        currentIndex = nextIndex;
        remainingDistance -= segmentDistance;
      } else {
        // Add a new point along the current segment
        const ratio = remainingDistance / segmentDistance;
        const newX = currentPoint.x + dx * ratio;
        const newY = currentPoint.y + dy * ratio;
        const newPoint = { x: newX, y: newY };
        newPoints.push(newPoint);

        // Update current point and reset remaining distance
        currentPoint = newPoint;
        remainingDistance = segmentLength;
      }

      // Safety check to prevent infinite loops
      if (newPoints.length > targetPointCount * 2) {
        console.warn("Safety break in point generation");
        break;
      }
    }

    // Ensure we have exactly the target number of points
    while (newPoints.length > targetPointCount) {
      newPoints.pop();
    }

    return { ...polygon, points: newPoints };
  };

  // Function to adjust the number of points in a polygon with equal distribution
  const adjustPolygonPoints = (polygon, targetPointCount) => {
    return generateEquidistantPoints(polygon, targetPointCount);
  };

  // Find the closest point in a polygon to the given coordinates
  const findClosestPoint = (points, x, y) => {
    let closestIndex = -1;
    let closestDistance = Infinity;

    points.forEach((point, index) => {
      const dx = point.x - x;
      const dy = point.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return { index: closestIndex, distance: closestDistance };
  };

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

  const handlePolygonSelection = polygon => {
    onPolygonSelection(polygon);
    redrawCanvas(selectedFile);

    // Store this selection in our tracking object
    setLastSelectedPolygonByFile(prev => ({
      ...prev,
      [selectedFile]: polygon,
    }));
    // Update point density to match the polygon's point count
    if (polygon.points && polygon.points.length) {
      setPointDensity(Math.min(100, Math.max(6, polygon.points.length * 2)));
    }
  };

  const handleMouseMove = e => {
    const canvas = canvasRef.current;
    if (!canvas) return;

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

    if (currentTool === "selector") {
      // Change cursor when hovering over points or edges
      const currentPolygons = polygons[selectedFile] || [];
      const tolerance = 10;
      let pointFound = false;

      // Check if hovering over a point - find the closest one
      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
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
        for (
          let polyIndex = 0;
          polyIndex < currentPolygons.length;
          polyIndex++
        ) {
          if (
            isPointNearEdge(x, y, currentPolygons[polyIndex].points, tolerance)
          ) {
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
        newPolygons[selectedPointIndex.polyIndex].points[
          selectedPointIndex.pointIndex
        ] = { x, y };
        const updatedPolygons = {
          ...polygons,
          [selectedFile]: newPolygons,
        };
        setPolygons(updatedPolygons);
        onUpdatePolygons(updatedPolygons);
        redrawCanvas(selectedFile);
      }
    } else if (currentTool === "move") {
      // Check if hovering over a polygon
      const currentPolygons = polygons[selectedFile] || [];
      let foundHover = false;

      for (let polyIndex = 0; polyIndex < currentPolygons.length; polyIndex++) {
        if (isPointInPolygon(x, y, currentPolygons[polyIndex].points)) {
          setHoveredPolygonIndex(polyIndex);
          foundHover = true;
          canvas.style.cursor = "move";
          // If we're dragging a polygon, move it
          if (isDraggingPolygon && hoveredPolygonIndex === polyIndex) {
            const newPolygons = [...currentPolygons];
            const dx = x - dragStartPos.x;
            const dy = y - dragStartPos.y;

            newPolygons[polyIndex].points = newPolygons[polyIndex].points.map(
              point => ({
                x: point.x + dx,
                y: point.y + dy,
              })
            );

            const updatedPolygons = {
              ...polygons,
              [selectedFile]: newPolygons,
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
        canvas.style.cursor = "default";
      }

      redrawCanvas(selectedFile);
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
        for (
          let polyIndex = 0;
          polyIndex < currentPolygons.length;
          polyIndex++
        ) {
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
      points: polygon.points.map(point => [point.x, point.y]),
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

  // Function to handle canceling the naming modal
  const handleCancelNaming = () => {
    setShowNamingModal(false);
    setPolygonName("");
    setCustomName("");
    setPolygonGroup("1");
    // Don't clear tempPolygon or currentPolygon to preserve the drawn points
  };

  // Function to delete a polygon completely
  const deletePolygon = polygonId => {
    if (!selectedFile) return;

    const currentFilePolygons = polygons[selectedFile] || [];
    const updatedPolygons = currentFilePolygons.filter(p => p.id !== polygonId);

    const newPolygons = {
      ...polygons,
      [selectedFile]: updatedPolygons,
    };

    setPolygons(newPolygons);
    onUpdatePolygons(newPolygons);

    // Clear selection if the deleted polygon was selected
    if (selectedPolygon && selectedPolygon.id === polygonId) {
      setSelectedPolygon(null);

      // Also remove from lastSelectedPolygonByFile
      setLastSelectedPolygonByFile(prev => {
        const updated = { ...prev };
        delete updated[selectedFile];
        return updated;
      });
    }

    // Redraw canvas to reflect changes
    redrawCanvas(selectedFile);
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
        redrawCanvas(selectedFile);
      }
    }
  };

  // Function to handle point density slider mouseup (when slider is dropped)
  const handlePointDensityMouseUp = () => {
    if (selectedPolygon) {
      // Make the polygon immediately editable by setting it as selected
      setSelectedPolygon({ ...selectedPolygon });

      // Force redraw to ensure the polygon is highlighted as selected
      redrawCanvas(selectedFile);
    }
  };

  // Function to toggle between polygon and mask display modes
  const toggleDisplayMode = () => {
    setDisplayMode(prevMode => {
      const newMode = prevMode === "polygon" ? "mask" : "polygon";
      console.log(`Switching display mode from ${prevMode} to ${newMode}`);

      // Force redraw with new mode
      setTimeout(() => {
        if (canvasRef.current) {
          redrawCanvas(selectedFile);
        }
      }, 50);

      return newMode;
    });
  };

  // Add an effect to ensure polygons are redrawn when they're created/updated
  useEffect(() => {
    // This effect will handle redrawing the canvas when polygons change
    if (selectedFile && canvasRef.current) {
      console.log("Redrawing canvas due to polygon changes");
      redrawCanvas(selectedFile);
    }
  }, [polygons, selectedFile]);

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
            aspectRatio: imageSize.width / imageSize.height,
            maxHeight: "70vh",
          }}
        >
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
            style={{ objectFit: "contain" }}
          />

          {/* Controls Section */}
          <div className="mt-4 w-full">
            {/* Point Radius Slider */}
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">
                Point Radius: {pointRadius}px
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={pointRadius}
                onChange={e => setPointRadius(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Point Density Slider (only show when a polygon is selected) */}
            {selectedPolygon && (
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">
                  Point Density: {selectedPolygon.points.length} points
                </label>
                <input
                  type="range"
                  min="6"
                  max="100"
                  value={pointDensity}
                  onChange={handlePointDensityChange}
                  onMouseUp={handlePointDensityMouseUp}
                  className="w-full"
                />
              </div>
            )}

            {/* Display Mode Toggle */}
            <div className="mb-4 flex space-x-4">
              <button
                onClick={() => setDisplayMode("polygon")}
                className={`px-4 py-2 rounded-md transition ${
                  displayMode === "polygon"
                    ? "bg-[#2E3192] text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Convert to Polygon
              </button>
              <button
                onClick={() => setDisplayMode("mask")}
                className={`px-4 py-2 rounded-md transition ${
                  displayMode === "mask"
                    ? "bg-[#2E3192] text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                Convert to Mask
              </button>
            </div>
          </div>

          <div className="mt-4 flex space-x-4">
            {/* <button
              onClick={processPolygons}
              className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
            >
              Process
            </button> */}
            <button
              onClick={joinPolygon}
              className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
            >
              Join
            </button>
            <button
              // Explicitly use showUI=true when clicking the View JSON button
              onClick={() => onExportPolygons(true)}
              className="bg-[#2E3192] rounded-full text-white px-8 py-2 hover:bg-[#1a1c4a] transition"
            >
              View JSON
            </button>
          </div>
        </div>
      ) : (
        <p className="text-[#2E3192] text-lg font-semibold">
          Select a file to preview
        </p>
      )}

      {/* Naming Modal */}
      {showNamingModal && (
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
      )}
    </div>
  );
};

export default Preview;
