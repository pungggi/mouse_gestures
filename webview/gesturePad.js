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
let triggerButton = "right"; // Default trigger button
let triggerButtonCode = 2; // Default: 2 for right-click

console.log("Gesture Pad script loaded from external file.");

// Listen for messages from the extension host
window.addEventListener("message", (event) => {
  const message = event.data; // The JSON data our extension sent
  switch (message.command) {
    case "setConfig":
      console.log("Received config:", message.config);
      triggerButton = message.config.triggerButton || "right";
      triggerButtonCode = triggerButton === "left" ? 0 : 2;
      console.log(
        `Trigger button set to: ${triggerButton} (code: ${triggerButtonCode})`
      );
      break;
  }
});

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
  ctx.strokeStyle = "#cccccc"; // Path color
  ctx.lineWidth = 1; // Make line thinner
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // Initial size

gestureArea.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // Prevent context menu inside the pad
});

gestureArea.addEventListener("mousedown", (e) => {
  // Only start drag for the configured mouse button
  if (e.button === triggerButtonCode) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    currentX = e.clientX; // Initialize current points
    currentY = e.clientY;
    console.log("Drag Start:", startX, startY);

    // --- Drawing Start ---
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous path
    ctx.beginPath();
    ctx.moveTo(startX, startY);

    // Prevent text selection during drag
    e.preventDefault();
  }
});

// Listen for mousemove and mouseup on the window to catch events
// even if the cursor leaves the gesture area during the drag.
window.addEventListener("mousemove", (e) => {
  if (isDragging) {
    currentX = e.clientX;
    currentY = e.clientY;

    // --- Drawing Update ---
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
  }
});

window.addEventListener("mouseup", (e) => {
  // Only process mouseup if dragging and it's the configured button
  if (isDragging && e.button === triggerButtonCode) {
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

    if (distance > minDistance) {
      let direction = "";
      // Determine primary direction (simple check)
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal gesture
        direction = dx > 0 ? "right" : "left";
      } else {
        // Vertical gesture
        direction = dy > 0 ? "down" : "up";
      }
      console.log(`Gesture detected: ${direction}`);
      // Send message back to the extension
      vscode.postMessage({
        command: "gestureDetected",
        details: { direction: direction },
      });
      // Clear the canvas after gesture is processed
      setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 50); // Small delay to ensure user sees the path briefly
    } else {
      console.log("Movement too short, no gesture detected.");
      // Optionally clear canvas even if no gesture, or leave path
      // setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 50);
    }
  }
});
