/**
 * Helper functions for polygon operations
 */

// Helper function to check if a point is inside a polygon
export const isPointInPolygon = (x, y, points) => {
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

// Helper function to find the closest point in a polygon to the given coordinates
export const findClosestPoint = (points, x, y) => {
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

// Helper function to find the closest point on a line segment
export const getClosestPointOnLine = (x, y, x1, y1, x2, y2) => {
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
export const isPointNearEdge = (x, y, points, threshold = 10) => {
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
export const calculatePerimeter = points => {
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const nextIndex = (i + 1) % points.length;
    const dx = points[nextIndex].x - points[i].x;
    const dy = points[nextIndex].y - points[i].y;
    perimeter += Math.sqrt(dx * dx + dy * dy);
  }
  return perimeter;
};

// Reorder points to ensure optimal polygon shape
export const reorderPoints = points => {
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

// Generate equidistant points along the boundary of a polygon
export const generateEquidistantPoints = (polygon, targetPointCount) => {
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
export const adjustPolygonPoints = (polygon, targetPointCount) => {
  return generateEquidistantPoints(polygon, targetPointCount);
};
