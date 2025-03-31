# Project Brief: VS Code Mouse Gesture Pad (Webview Approach)

## Core Requirement (Revised)

Create a VS Code extension that provides a dedicated panel (a "Gesture Pad" using a Webview) where users can perform **left-click drag gestures**. Based on the detected gesture (e.g., swipe direction), the extension should trigger corresponding VS Code commands (like switching editors).

## Background & Problem Evolution

The initial goal was to capture right-click gestures _directly within the main editor pane_ and prevent the context menu. However, investigation revealed this is **not feasible** using the standard VS Code Extension API due to limitations in accessing low-level editor mouse events and the unavailability of necessary internal commands (`_workbench.htmlRequest`).

Attempts to use alternative triggers like Alt+mouse-move or middle-click also faced similar API limitations or required complex external helper processes. API-only compromises like keybindings were deemed too far from the desired interaction.

Therefore, the project has pivoted to this Webview-based approach as a feasible alternative using supported APIs, acknowledging that gestures will occur in a separate panel, not the main editor.

## High-Level Plan: Webview Gesture Pad

1.  **Command:** Create a command to open/show the Gesture Pad webview panel.
2.  **Webview Panel:** Implement a simple webview with minimal styling.
3.  **Gesture Capture (Webview JS):** Use standard JavaScript event listeners within the webview to detect left-click (`button === 0`) mousedown, mousemove (while dragging), and mouseup events.
4.  **Gesture Analysis (Webview JS):** Calculate the direction and distance of the drag upon mouseup.
5.  **Communication (Webview -> Extension):** Use `vscode.postMessage()` to send detected gesture information (e.g., `{ command: 'gestureDetected', direction: 'right' }`) from the webview back to the extension host process.
6.  **Action Execution (Extension JS):** The extension listens for messages from the webview (`panel.webview.onDidReceiveMessage`). Upon receiving a gesture message, it executes the appropriate VS Code command (e.g., `vscode.commands.executeCommand('workbench.action.nextEditor')`).

## Goals (Revised)

- Provide a command to open a dedicated "Gesture Pad" webview panel.
- Reliably capture left-click drag gestures (start, movement, end) _within_ this panel.
- Implement basic gesture detection based on drag direction (e.g., left, right, up, down).
- Trigger specific VS Code commands based on the recognized gesture direction.
- Ensure the implementation uses only stable, documented VS Code APIs.
