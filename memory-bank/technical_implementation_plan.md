# Technical Implementation Plan for Complex Gesture Recognition

## Feature Completion Summary (April 16, 2025)

The complex gesture pattern recognition feature has been successfully implemented. This major milestone enables users to define and execute sophisticated command sequences using multi-directional mouse gestures.

### Key Implementations Completed

1. **Extension-Webview Communication Fix**: Resolved the mismatch between webview and extension by updating `extension.js` to correctly use `details.sequence` instead of `details.direction`.

2. **Gesture Matching Enhancements**:

   - Added `_findPatternMatch` method to support pattern-based gesture matching
   - Added robust error handling with try/catch blocks
   - Enhanced gesture matching with three-step approach:
     1. Exact match
     2. Prefix match
     3. Pattern match (when enabled)

3. **Configurable Thresholds**: Added user-configurable settings for gesture recognition sensitivity:

   - `mouseGestures.minDirectionChange`: Minimum distance to register a direction change
   - `mouseGestures.minVelocity`: Minimum velocity for direction change
   - `mouseGestures.enablePatternMatching`: Toggle for pattern matching
   - `mouseGestures.gestureDebounceTime`: Minimum time between gesture triggers

4. **Sequence Tracking**: Implemented full gesture sequence tracking in `webview/gesturePad.js` with noise filtering and direction detection.

### How Users Can Utilize This Feature

1. **Configuration**: Users can define complex gesture-to-command mappings in VS Code settings:

   ```json
   "mouseGestures.gestureCommands": [
     {
       "gesture": "LRUDLR",
       "actions": [
         { "command": "workbench.action.files.save" },
         { "command": "editor.action.formatDocument" }
       ],
       "executionMode": "sequential"
     }
   ]
   ```

2. **Customization**: Users can adjust recognition sensitivity through settings:

   ```json
   "mouseGestures.minDirectionChange": 25,
   "mouseGestures.minVelocity": 0.15,
   "mouseGestures.enablePatternMatching": true
   ```

3. **Usage**: Open the Gesture Pad view from the Activity Bar, then perform gestures with the configured mouse button (default: right). The extension will recognize complex patterns and execute the mapped commands.

### Gesture Path Visualization (Updated April 27, 2025)

- The gesture path drawn in the Gesture Pad (`webview/gesturePad.js`) is visualized as a line connecting the recorded points.
- A distinct circle marker is drawn at the starting point of the path.
- The arrowhead marker previously shown at the end point has been removed.

## Core Issue: Extension-Webview Mismatch (RESOLVED: April 16, 2025)

## Gesture Matching Enhancements (RESOLVED: April 16, 2025)

- Added \_findPatternMatch method to support pattern-based gesture matching
- Added robust error handling with try/catch blocks
- Enhanced gesture matching with three-step approach:
  1. Exact match
  2. Prefix match
  3. Pattern match (when enabled)

**Resolution:** The issue has been fixed by updating `extension.js` to correctly use `details.sequence` instead of `details.direction` for gesture processing.

### Problem Analysis

The fundamental issue is a communication mismatch between the webview (`gesturePad.js`) and the extension (`extension.js`):

1. **Webview Implementation (`gesturePad.js`):**

   ```javascript
   // Line 165-172
   const sequence = gestureSequence || detectInitialDirection(dx, dy);
   console.log(`Gesture sequence detected: ${sequence}`);

   // Send message back to the extension
   vscode.postMessage({
     command: "gestureDetected",
     details: { sequence: sequence },
   });
   ```

2. **Extension Implementation (`extension.js`):**

   ```javascript
   // Line 138-142
   async _handleGesture(details) {
     console.log("Handling gesture:", details);
     const direction = details?.direction;
     if (!direction) return;

     // Convert direction to gesture string...
   ```

The webview sends the gesture data in `details.sequence`, but the extension looks for it in `details.direction`. This mismatch prevents complex gestures from being properly processed.

## Proposed Solutions

### 1. Update Extension to Handle Sequence

The most straightforward solution is to update the `_handleGesture` method in `extension.js` to handle the sequence data:

```javascript
async _handleGesture(details) {
  console.log("Handling gesture:", details);

  // Support both new sequence format and legacy direction format
  const gestureSequence = details?.sequence;
  const direction = details?.direction;

  if (!gestureSequence && !direction) return;

  // Use sequence if available, otherwise fall back to direction
  const gesture = gestureSequence || gestureMap[direction];

  if (!gesture) {
    console.log(`Unknown gesture: ${gestureSequence || direction}`);
    return;
  }

  // Find matching gesture command configuration
  const gestureCommands = this._getGestureCommands();
  const match = gestureCommands.find((gc) => gc.gesture === gesture);

  if (!match) {
    console.log(`No commands mapped for gesture: ${gesture}`);
    return;
  }

  // Execute commands based on execution mode
  if (match.executionMode === "parallel") {
    await this._executeParallel(match.actions);
  } else {
    // Default to sequential execution
    await this._executeSequential(match.actions);
  }
}
```

### 2. Enhance Gesture Matching Logic

The current implementation only supports exact matching of gesture sequences. We should enhance this to support more flexible matching:

```javascript
// Find matching gesture command configuration
const gestureCommands = this._getGestureCommands();

// Try exact match first
let match = gestureCommands.find((gc) => gc.gesture === gesture);

// If no exact match, try prefix matching (e.g., "LR" would match "LRU")
if (!match) {
  match = gestureCommands.find(
    (gc) => gesture.startsWith(gc.gesture) && gc.matchType === "prefix"
  );
}

// If still no match, try pattern matching if enabled
if (!match && this._config.enablePatternMatching) {
  match = this._findPatternMatch(gesture, gestureCommands);
}
```

## Additional Technical Improvements

### 1. Diagonal Direction Support

Currently, the angle-based detection in `gesturePad.js` only supports cardinal directions (R, D, L, U). To support diagonal directions:

```javascript
// Calculate the primary direction using angles for more accurate detection
const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
let newDirection;

// 8-direction support (including diagonals)
if (angle > -22.5 && angle <= 22.5) {
  newDirection = "R";
} else if (angle > 22.5 && angle <= 67.5) {
  newDirection = "DR";
} else if (angle > 67.5 && angle <= 112.5) {
  newDirection = "D";
} else if (angle > 112.5 && angle <= 157.5) {
  newDirection = "DL";
} else if (angle > 157.5 || angle <= -157.5) {
  newDirection = "L";
} else if (angle > -157.5 && angle <= -112.5) {
  newDirection = "UL";
} else if (angle > -112.5 && angle <= -67.5) {
  newDirection = "U";
} else {
  newDirection = "UR";
}
```

### 2. Configurable Thresholds

Move hardcoded thresholds to configuration:

```javascript
// In extension.js
_sendConfig(webview) {
  const config = vscode.workspace.getConfiguration("mouseGestures");
  const gestureCommands = this._getGestureCommands();

  // Get threshold configurations
  const minDirectionChange = config.get("minDirectionChange") || 30;
  const minVelocity = config.get("minVelocity") || 0.2;

  webview.postMessage({
    command: "updateConfig",
    gestureCommands,
    thresholds: {
      minDirectionChange,
      minVelocity
    }
  });
}

// In gesturePad.js
window.addEventListener("message", (event) => {
  const message = event.data;

  if (message.command === "updateConfig") {
    // Update thresholds if provided
    if (message.thresholds) {
      minDirectionChange = message.thresholds.minDirectionChange;
      minVelocity = message.thresholds.minVelocity;
    }
  }
});
```

### 3. Gesture Debouncing

Add debouncing to prevent rapid, unintended gesture triggers:

```javascript
// In gesturePad.js
let lastGestureTime = 0;
const gestureDebounceTime = 500; // ms

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
      lastGestureTime = currentTime;
      const sequence = gestureSequence || detectInitialDirection(dx, dy);
      console.log(`Gesture sequence detected: ${sequence}`);

      // Send message back to the extension
      vscode.postMessage({
        command: "gestureDetected",
        details: { sequence: sequence },
      });

      // Clear the canvas after gesture is processed
      setTimeout(() => ctx.clearRect(0, 0, canvas.width, canvas.height), 50);
    } else {
      console.log(
        "Movement too short or too soon after previous gesture, no gesture detected."
      );
    }

    // Reset gesture tracking
    gestureSequence = "";
    lastDirection = null;
  }
});
```

### 4. Error Handling and Logging

Enhance error handling and logging for better debugging:

```javascript
// In extension.js
async _handleGesture(details) {
  try {
    console.log("Handling gesture:", details);

    // Support both new sequence format and legacy direction format
    const gestureSequence = details?.sequence;
    const direction = details?.direction;

    if (!gestureSequence && !direction) {
      console.warn("Received gesture event with no sequence or direction data");
      return;
    }

    // Rest of the implementation...

  } catch (error) {
    console.error("Error handling gesture:", error);
    // Optionally show error notification
    vscode.window.showErrorMessage(`Error processing gesture: ${error.message}`);
  }
}
```

## Implementation Priority

1. ✓ **Fix Extension-Webview Mismatch (Completed April 16, 2025)**: Updated `_handleGesture` method in `extension.js` to properly handle the sequence data from the webview.

2. ✓ **Add Configuration Options (Completed April 16, 2025)**: Added settings for gesture recognition thresholds and updated the extension to send these to the webview.

3. ✓ **Enhance Gesture Matching (Completed April 16, 2025)**: Implemented more flexible matching strategies for gesture sequences, including exact matching, prefix matching, and pattern matching support.

4. **Add Diagonal Support**: Update the angle-based detection to support diagonal directions.

5. **Improve Error Handling**: Add better error handling and logging for debugging.

## Package.json Updates

Add new configuration options to `package.json`:

```json
"configuration": {
  "title": "Mouse Gestures",
  "properties": {
    "mouseGestures.minDirectionChange": {
      "type": "number",
      "default": 30,
      "description": "Minimum distance (in pixels) to register a direction change"
    },
    "mouseGestures.minVelocity": {
      "type": "number",
      "default": 0.2,
      "description": "Minimum velocity (pixels/ms) for direction change"
    },
    "mouseGestures.enablePatternMatching": {
      "type": "boolean",
      "default": false,
      "description": "Enable pattern matching for gestures"
    },
    "mouseGestures.gestureDebounceTime": {
      "type": "number",
      "default": 500,
      "description": "Minimum time (in ms) between gesture triggers"
    }
  }
}
```
