# Product Context: VS Code Gesture Pad (Webview Approach)

## Problem Solved (Revised)

This project aims to provide an alternative input method for triggering common VS Code actions (like switching editors) using mouse gestures. Since direct gesture capture within the main editor is infeasible, this extension offers a dedicated "Gesture Pad" panel where users can perform **left-click drag gestures** to execute commands. This offers a mouse-driven alternative for users who prefer it over keyboard shortcuts or menus for certain frequent actions.

## How It Should Work (Revised)

1.  **Activation:** The user invokes a command (e.g., `mouseGestures.showGesturePad` via Command Palette or keybinding) to open the dedicated Gesture Pad webview panel.
2.  **Interaction:** The user moves their mouse cursor _into_ the Gesture Pad panel.
3.  **Gesture Execution:**
    - The user presses and holds the **left** mouse button within the panel.
    - The user moves the mouse (drags) in a direction (e.g., left, right, up, down).
    - The user releases the left mouse button.
4.  **Gesture Recognition:** The JavaScript within the webview analyzes the drag path (start point, end point, distance, direction).
5.  **Action Trigger:** If a recognized gesture is detected (e.g., drag distance > threshold and primarily horizontal right), the webview sends a message to the extension. The extension then executes the corresponding VS Code command (e.g., `workbench.action.nextEditor`).
6.  **No Gesture:** If the drag is too short or doesn't match a defined gesture pattern, no action is taken.
7.  **Gesture Assignment for Unrecognized Gestures:** If an unrecognized gesture is detected, the extension prompts the user to assign a command to it. The user can select a command from a list, optionally input a description for the gesture, and save the binding to their settings for future use.

## User Experience Goals (Revised)

- **Discoverable:** The command to open the Gesture Pad should be easily findable.
- **Clear Interaction Area:** The Gesture Pad panel should be visually distinct so the user knows where to perform gestures.
- **Responsive:** Gesture detection and action execution should feel immediate.
- **Reliable:** The gesture detection should work consistently within the panel.
- **Focused:** The extension provides a specific, alternative input method via the dedicated panel.
- **Customizable:** Users can assign commands to unrecognized gestures, enhancing personalization and usability.
- **(Future):** Potentially allow further configuration of gestures and associated commands.
