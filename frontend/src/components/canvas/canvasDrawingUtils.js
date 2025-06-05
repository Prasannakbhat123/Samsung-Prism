/**
 * Utility functions for canvas drawing operations
 */

// Draw just the image on the canvas without polygons
export const drawImageOnly = (canvas, img) => {
  if (!canvas || !img) return;

  const ctx = canvas.getContext("2d");

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw the image to fit the canvas
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
};

// Draw the complete canvas with image and polygons
export const redrawCanvas = (
  file,
  canvas,
  img,
  polygons,
  currentPolygon,
  selectedPolygon,
  displayMode,
  pointRadius,
  zoomLevel = 1,
  panOffset = { x: 0, y: 0 },
  imageLoadError = false
) => {
  console.log(`Redrawing Canvas for File: ${file} with zoom: ${zoomLevel}, pan: (${panOffset.x}, ${panOffset.y})`);
  if (!canvas || !img) return;

  const ctx = canvas.getContext("2d");

  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Save the context state
  ctx.save();
  
  // Apply pan and zoom transformations
  // First translate to center
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Apply pan offset
  ctx.translate(panOffset.x, panOffset.y);
  
  // Apply zoom with center point as origin
  ctx.translate(centerX, centerY);
  ctx.scale(zoomLevel, zoomLevel);
  ctx.translate(-centerX, -centerY);
  
  // Draw the image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  // Calculate scale for coordinates
  const scaleX = canvas.width / img.naturalWidth;
  const scaleY = canvas.height / img.naturalHeight;

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
  
  try {
    // Draw all existing polygons from the selected file
    const filePolygons = (polygons[file] || []);
    console.log(`Drawing ${filePolygons.length} polygons for file ${file}`);
    
    filePolygons.forEach((polygon) => {
      if (!polygon.points || !Array.isArray(polygon.points) || polygon.points.length < 3) {
        console.warn(`Skipping invalid polygon: ${polygon.name}`, polygon);
        return;
      }
      
      ctx.beginPath();

      const scaledPoints = polygon.points.map(point => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }));
      
      // Choose different colors based on polygon selection state
      const isSelected = selectedPolygon && selectedPolygon.name === polygon.name;
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
    if (currentPolygon && currentPolygon.length > 0) {
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
    
  } catch (err) {
    console.error("Error drawing on canvas:", err);
  }
  
  // Restore the context state (to reset transformations)
  ctx.restore();
};

// Draw the selected polygon with highlights
export const redrawSelectedPolygon = (
  polygon,
  selectedFile,
  canvas,
  img,
  displayMode,
  pointRadius,
  zoomLevel = 1
) => {
  if (!polygon || !polygon.points || polygon.points.length < 3) {
    console.warn("Cannot redraw invalid selected polygon", polygon);
    return;
  }
  
  console.log(`Redrawing selected polygon: ${polygon.name} with ${polygon.points.length} points`);
  
  // Force redraw the entire canvas to ensure proper rendering
  redrawCanvas(selectedFile, canvas, img, {[selectedFile]: [polygon]}, [], polygon, displayMode, pointRadius, zoomLevel);
};
