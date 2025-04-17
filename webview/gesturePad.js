// Script for the Gesture Pad Webview

// VS Code API object provided by the webview context
const vscode = acquireVsCodeApi();

const gestureArea = document.getElementById("gesture-area");
const canvas = document.getElementById("path-canvas");
const ctx = canvas.getContext("2d");
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
/**
 * Tracks the last detected direction and the full gesture sequence.
 * The gestureSequence variable accumulates all direction changes (e.g., "LRUDLR"),
 * supporting complex gesture patterns for advanced matching.
 */
let lastDirection = null;
let gestureSequence = "";
let lastX = 0;
let lastY = 0;
let minDirectionChange = 30; // Minimum distance to register a direction change
let lastTime = 0;
let minVelocity = 0.2; // Minimum velocity (pixels/ms) for direction change
let gestureDebounceTime = 500; // Minimum time between gesture triggers
let lastGestureTime = 0; // Track last gesture time for debouncing

// No gesture history variables needed for preview-only functionality

// Variables for visual feedback
let directionMarkers = [];
const markerColors = {
  L: "#ff0000", // Red
  R: "#00ff00", // Green
  U: "#0000ff", // Blue
  D: "#ffff00", // Yellow
};
const markerSize = 5; // Size of direction change markers in pixels

// Customization options
let pathColor = "#cccccc";
let pathThickness = 1;
let showDirectionMarkers = true;
let enableGesturePreview = true;

console.log("Gesture Pad script loaded from external file.");

// Resize canvas to fit window
function resizeCanvas() {
  canvas.width = gestureArea.clientWidth;
  canvas.height = gestureArea.clientHeight;
  console.log(`Canvas resized: ${canvas.width}x${canvas.height}`);
  // Redraw setup after resize if needed
  setupCanvasContext();
}

function setupCanvasContext() {
  // --- Drawing Setup ---
  ctx.strokeStyle = pathColor;
  ctx.lineWidth = pathThickness;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

// Handle messages from the extension
window.addEventListener("message", (event) => {
  const message = event.data;

  if (message.command === "updateConfig") {
    // Update thresholds if provided
    if (message.thresholds) {
      minDirectionChange = message.thresholds.minDirectionChange;
      minVelocity = message.thresholds.minVelocity;
      //enablePatternMatching = message.thresholds.enablePatternMatching;
      gestureDebounceTime = message.thresholds.gestureDebounceTime;
    }

    // Update visual settings if provided
    if (message.visualSettings) {
      pathColor = message.visualSettings.pathColor;
      pathThickness = message.visualSettings.pathThickness;
      showDirectionMarkers = message.visualSettings.showDirectionMarkers;
      enableGesturePreview = message.visualSettings.showGesturePreview;

      // Apply settings to canvas context
      setupCanvasContext();
    }
  }
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // Initial size

gestureArea.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // Prevent context menu inside the pad
});

gestureArea.addEventListener("mousedown", (e) => {
  // Accept both left (0) and right (2) mouse buttons
  if (e.button === 0 || e.button === 2) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    currentX = e.clientX;
    currentY = e.clientY;
    lastX = e.clientX;
    lastY = e.clientY;
    lastTime = Date.now();
    console.log("Drag Start:", startX, startY);

    // --- Drawing Start ---
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous path
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // Clear any existing direction markers
    directionMarkers = [];

    // Prevent text selection during drag
    e.preventDefault();
  }
});

// Listen for mousemove and mouseup on the window to catch events
// even if the cursor leaves the gesture area during the drag.
// Helper function to detect initial direction
function detectInitialDirection(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? "R" : "L";
  } else {
    return dy > 0 ? "D" : "U";
  }
}

// Helper function to detect direction changes
function detectDirectionChange(newX, newY) {
  const currentTime = Date.now();
  const timeElapsed = currentTime - lastTime;

  if (timeElapsed === 0) return null;

  const dx = newX - lastX;
  const dy = newY - lastY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const velocity = distance / timeElapsed;

  // Check if movement is significant enough
  if (distance < minDirectionChange || velocity < minVelocity) {
    return null;
  }

  // Calculate the primary direction using angles for more accurate detection
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  let newDirection;

  if (angle > -45 && angle <= 45) {
    newDirection = "R";
  } else if (angle > 45 && angle <= 135) {
    newDirection = "D";
  } else if (angle > 135 || angle <= -135) {
    newDirection = "L";
  } else {
    newDirection = "U";
  }

  // Only update tracking variables and return direction if it's different
  if (newDirection !== lastDirection) {
    // Add a direction marker at the point where direction changes
    directionMarkers.push({
      x: newX,
      y: newY,
      direction: newDirection,
      color: markerColors[newDirection] || "#ffffff",
    });

    lastX = newX;
    lastY = newY;
    lastTime = currentTime;
    return newDirection;
  }

  return null;
}

window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    currentX = e.clientX;
    currentY = e.clientY;

    // --- Drawing Update ---
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    // Draw direction markers if enabled
    if (showDirectionMarkers) {
      directionMarkers.forEach((marker) => {
        ctx.save();
        ctx.fillStyle = marker.color;
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, markerSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // Detect direction changes
    const newDirection = detectDirectionChange(currentX, currentY);
    if (newDirection) {
      if (!lastDirection) {
        lastDirection = newDirection;
        gestureSequence = newDirection;
      } else if (newDirection !== lastDirection) {
        lastDirection = newDirection;
        gestureSequence += newDirection;
      }
      console.log(`Current gesture sequence: ${gestureSequence}`);
    }
  }
});

// Function to display the current gesture
function showGesturePreview(sequence) {
  // Create or update a preview element
  let previewElement = document.getElementById("gesture-preview");
  if (!previewElement) {
    previewElement = document.createElement("div");
    previewElement.id = "gesture-preview";
    previewElement.style.position = "absolute";
    previewElement.style.bottom = "10px";
    previewElement.style.left = "10px";
    previewElement.style.padding = "5px";
    previewElement.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
    previewElement.style.color = "#ffffff";
    previewElement.style.borderRadius = "3px";
    previewElement.style.fontFamily = "monospace";
    previewElement.style.fontSize = "14px";
    gestureArea.appendChild(previewElement);
  }

  previewElement.textContent = `Gesture: ${sequence}`;

  // Show the preview briefly then fade out
  previewElement.style.opacity = "1";
  setTimeout(() => {
    previewElement.style.opacity = "0";
    previewElement.style.transition = "opacity 1s";
  }, 2000);
}

// Function to normalize gesture sequences by removing repeated consecutive directions
function normalizeGestureSequence(sequence) {
  // Remove repeated consecutive directions (e.g., "LLLRR" -> "LR")
  let normalized = "";
  for (let i = 0; i < sequence.length; i++) {
    if (i === 0 || sequence[i] !== sequence[i - 1]) {
      normalized += sequence[i];
    }
  }
  return normalized;
}

window.addEventListener("mouseup", (e) => {
  // Process mouseup if dragging and it's the same button that started the drag
  if (isDragging && (e.button === 0 || e.button === 2)) {
    isDragging = false;
    console.log("Drag End:", currentX, currentY);

    // Use final currentX/Y for calculation
    const dx = currentX - startX;
    const dy = currentY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDistance = 30; // Minimum distance to be considered a gesture

    console.log(
      `Gesture details: dx=${dx}, dy=${dy}, dist=${distance.toFixed(2)}`
    );

    const currentTime = Date.now();
    if (
      distance > minDistance &&
      currentTime - lastGestureTime > gestureDebounceTime
    ) {
      let sequence = gestureSequence || detectInitialDirection(dx, dy);

      // Normalize the sequence by removing repeated consecutive directions
      sequence = normalizeGestureSequence(sequence);

      console.log(`Gesture sequence detected: ${sequence}`);

      // Show gesture preview if enabled
      if (enableGesturePreview) {
        showGesturePreview(sequence);
      }

      // Send message back to the extension
      vscode.postMessage({
        command: "gestureDetected",
        details: { sequence: sequence },
      });

      // Update last gesture time for debouncing
      lastGestureTime = currentTime;

      // Clear the canvas after gesture is processed
      setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 50);
    } else {
      if (distance <= minDistance) {
        console.log("Movement too short, no gesture detected.");
      } else {
        console.log("Gesture ignored due to debouncing.");
      }
    }

    // Reset gesture tracking
    gestureSequence = "";
    lastDirection = null;
    directionMarkers = []; // Clear direction markers
  }
});
