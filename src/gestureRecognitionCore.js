// Shared gesture recognition logic

// Helper to determine if we're in a browser or Node.js environment
/* global window */
const isNode = typeof window === "undefined";
// Use the built-in global object in Node.js environment
const globalObj = isNode ? global : window;

/**
 * Douglas-Peucker path simplification algorithm
 */
function simplifyDouglasPeucker(points, epsilon) {
  if (points.length < 3) return points;

  // Find the point with the maximum distance from the line between start and end
  let dmax = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  function perpendicularDistance(pt, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    if (dx === 0 && dy === 0) {
      return Math.sqrt((pt.x - lineStart.x) ** 2 + (pt.y - lineStart.y) ** 2);
    }
    const t =
      ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) /
      (dx * dx + dy * dy);
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    return Math.sqrt((pt.x - projX) ** 2 + (pt.y - projY) ** 2);
  }

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], start, end);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilon) {
    // Recursive simplification
    const rec1 = simplifyDouglasPeucker(points.slice(0, index + 1), epsilon);
    const rec2 = simplifyDouglasPeucker(points.slice(index), epsilon);
    return rec1.slice(0, -1).concat(rec2);
  } else {
    return [start, end];
  }
}

/**
 * Generate a direction sequence from a path using angle-based detection
 */
function generateDirectionSequenceFromPath(path, minDist = 35) {
  if (!path || path.length < 2) return "";
  const ANGLE_THRESHOLD = 45; // Only register direction change if angle diff > 45°
  let sequence = "";
  let lastDirection = null;
  let lastAngle = null;
  let lastPoint = path[0];

  function angleToDirection(angle) {
    if (angle < 0) angle += 360;
    if (angle >= 337.5 || angle < 22.5) return "R";
    if (angle >= 22.5 && angle < 67.5) return "DR";
    if (angle >= 67.5 && angle < 112.5) return "D";
    if (angle >= 112.5 && angle < 157.5) return "DL";
    if (angle >= 157.5 && angle < 202.5) return "L";
    if (angle >= 202.5 && angle < 247.5) return "UL";
    if (angle >= 247.5 && angle < 292.5) return "U";
    if (angle >= 292.5 && angle < 337.5) return "UR";
    return "R";
  }

  for (let i = 1; i < path.length; i++) {
    const dx = path[i].x - lastPoint.x;
    const dy = path[i].y - lastPoint.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) continue;

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const dir = angleToDirection(angle);

    if (
      dir !== lastDirection &&
      (lastAngle === null || Math.abs(angle - lastAngle) > ANGLE_THRESHOLD)
    ) {
      sequence += dir;
      lastDirection = dir;
      lastAngle = angle;
    }
    lastPoint = path[i];
  }

  // Final segment check
  const finalDx = path[path.length - 1].x - lastPoint.x;
  const finalDy = path[path.length - 1].y - lastPoint.y;
  const finalDist = Math.sqrt(finalDx * finalDx + finalDy * finalDy);
  if (finalDist >= minDist) {
    const finalAngle = (Math.atan2(finalDy, finalDx) * 180) / Math.PI;
    const finalDir = angleToDirection(finalAngle);
    if (
      finalDir !== lastDirection &&
      (lastAngle === null || Math.abs(finalAngle - lastAngle) > ANGLE_THRESHOLD)
    ) {
      sequence += finalDir;
    }
  }

  return sequence;
}

/**
 * Normalize a gesture sequence by removing repeated consecutive directions
 */
function normalizeGestureSequence(sequence) {
  let normalized = "";
  for (let i = 0; i < sequence.length; i++) {
    if (i === 0 || sequence[i] !== sequence[i - 1]) {
      normalized += sequence[i];
    }
  }
  return normalized;
}

// Export functions for both browser and node environments
// Create an object with our exports
const exportedFunctions = {
  simplifyDouglasPeucker,
  generateDirectionSequenceFromPath,
  normalizeGestureSequence,
};

// Export for Node.js or attach to window for browser
if (typeof module !== "undefined" && module.exports) {
  module.exports = exportedFunctions;
} else {
  Object.assign(globalObj, exportedFunctions);
}
