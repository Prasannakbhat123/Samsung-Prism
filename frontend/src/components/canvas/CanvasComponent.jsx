import React, { useRef, useEffect } from "react";
import { drawImageOnly, redrawCanvas } from "./canvasDrawingUtils";
import { 
  handleCanvasClick, 
  handleMouseMove, 
  handleMouseUp 
} from "./canvasEventHandlers";

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
  const handleClick = (e) => {
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

  // Canvas mouse events object
  const canvasMouseEvents = {
    onClick: handleClick,
    onMouseMove: handleMove,
    onMouseUp: handleUp,
    onMouseLeave: handleUp,
    onMouseDown: e => startPan(e),
    onContextMenu: e => e.preventDefault(), // Prevent right-click menu
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
