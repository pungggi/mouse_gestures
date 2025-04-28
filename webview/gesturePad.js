// Script for the Gesture Pad Webview
const vscode = acquireVsCodeApi();

/* global simplifyDouglasPeucker */
/* global generateDirectionSequenceFromPath */
/* global normalizeGestureSequence */

// The gesture recognition functions are loaded from gestureRecognitionCore.js in the HTML

const gestureArea = document.getElementById("gesture-area");
const canvas = document.getElementById("path-canvas");
const ctx = canvas.getContext("2d");
let isDragging = false;
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
// Store the full path as an array of points
let gesturePath = [];

// Variables for visual feedback

// Customization options
let pathColor = "#cccccc";
let pathThickness = 1;
let enableGesturePreview = true;
let gestureCommands = []; // Store gesture commands from configuration

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
    // Store gesture commands
    if (message.gestureCommands) {
      gestureCommands = message.gestureCommands;
    }

    // Update visual settings if provided
    if (message.visualSettings) {
      pathColor = message.visualSettings.pathColor;
      pathThickness = message.visualSettings.pathThickness;
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
    gesturePath = [{ x: startX, y: startY }];
    console.log("Drag Start:", startX, startY);

    // --- Drawing Start ---
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous path
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // Draw a circle at the starting point
    ctx.arc(startX, startY, 5, 0, Math.PI * 2); // Draw a circle with radius 5
    ctx.fillStyle = pathColor;
    ctx.fill();
    ctx.beginPath(); // Start a new path for the line
    ctx.moveTo(startX, startY);

    // Prevent text selection during drag
    e.preventDefault();
  }
});

// Listen for mousemove and mouseup on the window to catch events
// even if the cursor leaves the gesture area during the drag.
// Helper function to detect initial direction

window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    currentX = e.clientX;
    currentY = e.clientY;

    // --- Drawing Update ---
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    // Record the point in the gesture path
    gesturePath.push({ x: currentX, y: currentY });
  }
});

// Function to find matching gesture command and get all action descriptions
function findGestureDescriptions(sequence) {
  // Find exact match first
  const match = gestureCommands.find((cmd) => cmd.gesture === sequence);
  if (match && match.actions && match.actions.length > 0) {
    // Return all action descriptions
    return {
      gesture: sequence,
      descriptions: match.actions.map((action) => ({
        command: action.command,
        description: action.description || "",
      })),
    };
  }

  // Try pattern match if no exact match
  // Get all pattern-type commands
  const patternCommands = gestureCommands.filter(
    (cmd) => cmd.matchType === "pattern"
  );

  // Log for debugging
  console.log(
    `Testing ${sequence} against ${patternCommands.length} pattern commands`
  );

  // Test each pattern against the sequence
  for (const cmd of patternCommands) {
    try {
      console.log(`Testing pattern: ${cmd.gesture}`);
      // Create a RegExp object from the gesture pattern
      const regex = new RegExp(cmd.gesture);

      // Test if the sequence matches the pattern
      if (regex.test(sequence)) {
        console.log(`Match found for pattern: ${cmd.gesture}`);
        return {
          gesture: sequence,
          descriptions: cmd.actions.map((action) => ({
            command: action.command,
            description: action.description || "",
          })),
        };
      }
    } catch (error) {
      console.error(`Invalid regex pattern: ${cmd.gesture}`, error);
      // Continue to the next pattern if this one is invalid
    }
  }

  // No match found
  console.log(`No pattern match found for: ${sequence}`);
  return {
    gesture: sequence,
    descriptions: [],
  };
}

// Function to display the current gesture and all its action descriptions
function showGesturePreview(gestureInfo) {
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
    previewElement.style.maxWidth = "90%";
    previewElement.style.overflow = "auto";
    gestureArea.appendChild(previewElement);
  }

  // Clear previous content
  previewElement.innerHTML = "";

  // Format descriptions with curly braces
  const formattedDescriptions = gestureInfo.descriptions
    .map((item) => `{${item.description}}`)
    .join(" "); // Join with spaces

  // Combine sequence and descriptions
  const displayText =
    gestureInfo.descriptions.length > 0
      ? `${gestureInfo.gesture} ${formattedDescriptions}`
      : gestureInfo.gesture;

  // Debug log to verify the display text
  console.log("Gesture display text:", displayText);
  console.log("Gesture info:", gestureInfo);

  // Set the text content directly
  previewElement.textContent = displayText;
  previewElement.style.fontWeight = "normal";
  previewElement.style.padding = "8px"; // Slightly more padding for better readability

  // Show the preview briefly then fade out
  previewElement.style.opacity = "1";
  // Increase timeout for longer display since there's more content
  setTimeout(() => {
    previewElement.style.opacity = "0";
    previewElement.style.transition = "opacity 1s";
  }, 4000);
}

// --- Mouseup handler: finalize gesture, simplify, and extract directions ---
window.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;

    if (gesturePath.length > 1) {
      // 1. Aggressive path simplification (Douglas-Peucker)
      // Epsilon controls simplification strength; higher = more aggressive
      const epsilon = 18; // pixels, adjust as needed for best results
      const simplifiedPath = simplifyDouglasPeucker(gesturePath, epsilon);

      // 2. Generate and normalize direction sequence
      let rawSequence = generateDirectionSequenceFromPath(simplifiedPath);
      let normalizedSequence = normalizeGestureSequence(rawSequence);

      // 3. Show preview and send to extension
      if (enableGesturePreview) {
        const gestureInfo = findGestureDescriptions(normalizedSequence);
        showGesturePreview(gestureInfo);
      }

      vscode.postMessage({
        command: "gestureDetected",
        sequence: normalizedSequence,
        rawSequence: rawSequence,
        simplifiedPath: simplifiedPath,
        originalPath: gesturePath,
      });
    }

    // Reset path for next gesture
    gesturePath = [];
  }
  // Send a message to the extension indicating that the webview is ready
  vscode.postMessage({
    command: "webviewReady",
  });
});
