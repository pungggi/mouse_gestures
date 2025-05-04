// JavaScript for Mouse Gestures Cheat Sheet Webview

// Initialize VS Code API once
const vscode = acquireVsCodeApi();

function renderGestures(gestures) {
  const container = document.getElementById("gesture-container");
  if (!container) {
    console.error("Container element #gesture-container not found");
    return;
  }

  container.innerHTML = ""; // Clear previous content

  if (!gestures || gestures.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; margin-top: 32px; font-style: italic; color: var(--vscode-disabledForeground, #888);">
        No gesture commands configured. Add gestures in settings.json.
      </div>
    `;
    return;
  }

  // Add title
  const title = document.createElement("h1");
  title.textContent = "Mouse Gestures";
  title.style.fontSize = "1.2rem";
  title.style.marginBottom = "16px";
  title.style.textAlign = "center";
  title.style.color = "var(--vscode-editor-foreground)";
  container.appendChild(title);

  // Create grid container
  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(200px, 1fr))";
  grid.style.gap = "20px";
  grid.style.marginTop = "16px";
  grid.style.padding = "10px";

  // Sort gestures by complexity (length of gesture string)
  gestures.sort((a, b) => a.gesture.length - b.gesture.length);

  gestures.forEach((gestureConfig) => {
    // Check if this is a wheel gesture
    const isWheelGesture = gestureConfig.inputType === "wheel";

    // Create card for each gesture
    const card = document.createElement("div");

    // Apply appropriate styling based on input type
    if (isWheelGesture) {
      card.className = "wheel-gesture-card";

      // Add hover effect for wheel gestures
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-2px)";
        card.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)";
        card.style.boxShadow = "none";
      });
    } else {
      card.className = "gesture-card"; // Use the class from CSS instead of inline styles

      // Add hover effect for non-wheel gestures
      card.addEventListener("mouseenter", () => {
        card.style.transform = "translateY(-2px)";
        card.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
      });

      card.addEventListener("mouseleave", () => {
        card.style.transform = "translateY(0)";
        card.style.boxShadow = "none";
      });
    }

    // Add gesture name/pattern with appropriate styling
    const gestureName = document.createElement("div");
    gestureName.style.fontSize = "1rem";
    gestureName.style.textAlign = "left";
    gestureName.style.marginLeft = "12px";
    gestureName.style.width = "100%";

    if (isWheelGesture) {
      // For wheel gestures, create a more elegant display
      gestureName.className = "wheel-gesture-name";

      // Just show the gesture direction without the [WHEEL] text
      // The styling will make it clear it's a wheel gesture
      gestureName.textContent = gestureConfig.gesture;

      // Add a small wheel icon or indicator
      const wheelIndicator = document.createElement("span");
      wheelIndicator.textContent = " ⦿"; // Unicode wheel-like symbol
      wheelIndicator.style.fontSize = "1rem";
      wheelIndicator.style.verticalAlign = "middle";
      wheelIndicator.style.marginLeft = "6px";
      wheelIndicator.style.color =
        "var(--vscode-statusBarItem-warningBackground, #e9a700)";
      gestureName.appendChild(wheelIndicator);
    } else {
      gestureName.textContent = gestureConfig.gesture;
      gestureName.style.fontWeight = "bold";
      gestureName.style.color = "var(--vscode-textLink-foreground, #3794ff)";
      gestureName.style.marginBottom = "8px";

      gestureName.style.textTransform = "uppercase";
      gestureName.style.letterSpacing = "1px";
    }

    card.appendChild(gestureName);

    // Container for SVG visualization
    const visualContainer = document.createElement("div");
    visualContainer.style.marginBottom = "8px";
    visualContainer.style.display = "flex";
    visualContainer.style.justifyContent = "center";
    visualContainer.style.width = "100%";

    // Visualize the gesture
    const svgElement = visualizeGesture(gestureConfig.gesture);
    visualContainer.appendChild(svgElement);
    card.appendChild(visualContainer);

    // Add command container
    const commandContainer = document.createElement("div");
    commandContainer.style.textAlign = "left";
    commandContainer.style.marginLeft = "12px";
    commandContainer.style.fontSize = "0.9rem";
    commandContainer.style.wordBreak = "break-word";
    commandContainer.style.width = "100%";

    // Format commands based on execution mode
    const isParallel = gestureConfig.executionMode === "parallel";

    // Process each action
    gestureConfig.actions.forEach((action, index) => {
      const commandText = action.description
        ? action.description
        : action.command.split(".").pop();

      const commandLine = document.createElement("div");
      commandLine.style.marginBottom = "2px";

      if (isParallel) {
        // For parallel commands: → command
        commandLine.innerHTML = `→ ${commandText}`;
      } else {
        // For sequential commands: 1. command, omit numbering for single command
        commandLine.innerHTML =
          gestureConfig.actions.length === 1
            ? commandText
            : `${index + 1}. ${commandText}`;
      }

      commandContainer.appendChild(commandLine);
    });

    card.appendChild(commandContainer);

    // Add click event listener to navigate to gesture definition
    card.addEventListener("click", () => {
      const messagePayload = {
        command: "navigateToGesture",
        gestureId: gestureConfig.gesture,
      };
      vscode.postMessage(messagePayload);
    });
    card.style.cursor = "pointer";

    // Add card to grid
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// Function to visualize gesture
function visualizeGesture(gestureString) {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");

  // Use smaller scale for more compact visualization
  const startX = 50; // Center point
  const startY = 50;
  let currentX = startX;
  let currentY = startY;
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  // Add start circle
  const circle = document.createElementNS(svgNS, "circle");
  circle.setAttribute("cx", startX);
  circle.setAttribute("cy", startY);
  circle.setAttribute("r", "4"); // Smaller radius
  circle.setAttribute("fill", "var(--vscode-textLink-foreground, #3794ff)");
  svg.appendChild(circle);

  // Define direction vectors (smaller scale)
  const directions = {
    U: [0, -15], // Up
    D: [0, 15], // Down
    L: [-15, 0], // Left
    R: [15, 0], // Right
  };

  gestureString.split("").forEach((dir) => {
    const [dx, dy] = directions[dir] || [0, 0]; // Default to no movement if invalid
    const endX = currentX + dx;
    const endY = currentY + dy;

    // Update bounds
    if (endX < minX) minX = endX;
    if (endX > maxX) maxX = endX;
    if (endY < minY) minY = endY;
    if (endY > maxY) maxY = endY;

    // Create individual line segment
    const line = document.createElementNS(svgNS, "line");
    line.setAttribute("x1", currentX);
    line.setAttribute("y1", currentY);
    line.setAttribute("x2", endX);
    line.setAttribute("y2", endY);
    line.setAttribute("stroke", "var(--vscode-editor-foreground)");
    line.setAttribute("stroke-width", "2");
    svg.appendChild(line);

    currentX = endX;
    currentY = endY;
  });

  // Calculate dimensions with padding
  const padding = 10;
  const width = Math.max(maxX - minX + 2 * padding, 30);
  const height = Math.max(maxY - minY + 2 * padding, 30);

  // Set viewBox to focus on the actual path
  svg.setAttribute(
    "viewBox",
    `${minX - padding} ${minY - padding} ${width} ${height}`
  );

  // Set reasonable dimensions
  svg.setAttribute("width", "100");
  svg.setAttribute("height", "100");

  return svg;
}

// Set up message handling with error handling
window.addEventListener("message", (event) => {
  try {
    const message = event.data;
    console.log("Received message:", message);

    if (message.command === "loadGestures") {
      if (Array.isArray(message.data)) {
        console.log("Rendering gestures:", message.data);
        renderGestures(message.data);
      } else {
        console.error("Received invalid gestures data:", message.data);

        // Show error in UI
        const container = document.getElementById("gesture-container");
        if (container) {
          container.innerHTML = `
            <div style="text-align: center; margin-top: 32px; font-style: italic; color: var(--vscode-disabledForeground, #888);">
              Error loading gesture data. Please check your settings.json configuration.
            </div>
          `;
        }
      }
    }
  } catch (error) {
    console.error("Error handling message:", error);
  }
});
