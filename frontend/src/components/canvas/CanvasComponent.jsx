import React, { useRef, useEffect } from "react";
import { drawImageOnly, redrawCanvas } from "./canvasDrawingUtils";
import { 
  handleCanvasClick, 
  handleMouseMove, 
  handleMouseUp 
} from "./canvasEventHandlers";
import { sendRITMClick } from "./ritmApi";

const CanvasComponent = ({
  selectedFile,
  currentTool,
  polygons,
  currentPolygon,
  selectedPolygon,
  displayMode,
  pointRadius,
  imageRef,
  canvasContainerRef,
  imageSize,
  imageLoadError,
  zoomLevel,
  panOffset,
  isPanning,
  setIsPanning,
  setIsDraggingPoint,
  setIsDraggingPolygon,
  hoveredPolygonIndex,
  isDraggingPoint,
  isDraggingPolygon,
  selectedPointIndex,
  dragStartPos,
  setDragStartPos,
  setHoveredPolygonIndex,
  setCurrentPolygon,
  onUpdatePolygons,
  setPolygons,
  setSelectedPolygon,
  onPolygonSelection,
  startPan,
  endPan,
  doPan,
  isPointInPolygon,
  isPointNearEdge,
  findClosestPoint,
}) => {
  const canvasRef = useRef(null);

  // Effect to redraw canvas when various dependencies change
  useEffect(() => {
    if (selectedFile && canvasRef.current) {
      if (selectedPolygon) {
        redrawCanvas(
          selectedFile,
          canvasRef,
          imageRef,
          polygons,
          currentPolygon,
          selectedPolygon,
          displayMode,
          pointRadius,
          zoomLevel,
          panOffset,
          imageLoadError
        );
      } else {
        redrawCanvas(
          selectedFile,
          canvasRef,
          imageRef,
          polygons,
          currentPolygon,
          selectedPolygon,
          displayMode,
          pointRadius,
          zoomLevel,
          panOffset,
          imageLoadError
        );
      }
    }
  }, [
    selectedFile,
    polygons,
    currentPolygon,
    selectedPolygon,
    displayMode,
    pointRadius,
    zoomLevel,
    panOffset,
    imageLoadError,
  ]);

  // Define wrapper functions that pass the necessary references
  const handleRITMClick = (e, isPositive) => {
    console.log("handleRITMClick called with isPositive:", isPositive);
    // Compute image coordinates (reuse logic from handleClick)
    if (!canvasRef.current || !imageRef.current || !selectedFile) return;
    const canvas = canvasRef.current;
    const img = imageRef.current;
    const rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;
    // Calculate scale and pan/zoom (reuse from handleCanvasClick)
    const scaleX = canvas.width / img.naturalWidth;
    const scaleY = canvas.height / img.naturalHeight;
    const scaleFit = Math.min(scaleX, scaleY);
    const imgWidth = img.naturalWidth * scaleFit;
    const imgHeight = img.naturalHeight * scaleFit;
    const centerX = (canvas.width - imgWidth) / 2;
    const centerY = (canvas.height - imgHeight) / 2;
    x -= panOffset.x;
    y -= panOffset.y;
    x -= canvas.width / 2;
    y -= canvas.height / 2;
    x /= zoomLevel;
    y /= zoomLevel;
    x += canvas.width / 2;
    y += canvas.height / 2;
    x = (x - centerX) / imgWidth * img.naturalWidth;
    y = (y - centerY) / imgHeight * img.naturalHeight;
    if (x < 0 || y < 0 || x > img.naturalWidth || y > img.naturalHeight) return;
    sendRITMClick(Math.round(x), Math.round(y), isPositive);
  };

  const handleClick = (e) => {
    console.log("Left click detected");
    handleRITMClick(e, true);
    handleCanvasClick(
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
    );
  };

  const handleMove = (e) => {
    handleMouseMove(
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
    );
  };

  const handleUp = () => {
    handleMouseUp(
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
    );
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    console.log("Right click (contextmenu) detected");
    handleRITMClick(e, false);
  };

  // Canvas mouse events object
  const canvasMouseEvents = {
    onClick: handleClick,
    onMouseMove: handleMove,
    onMouseUp: handleUp,
    onMouseLeave: handleUp,
    onMouseDown: e => startPan(e),
    onContextMenu: handleContextMenu,
  };

  return (
    <canvas
      ref={canvasRef}
      {...canvasMouseEvents}
      className="max-w-full max-h-full border-4 border-gray-400 rounded-lg shadow-md"
      style={{ objectFit: "contain" }}
    />
  );
};

export default CanvasComponent;
