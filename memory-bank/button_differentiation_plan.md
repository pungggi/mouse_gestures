# Plan: Differentiate Mouse Buttons for Gestures

This plan outlines the steps to modify the Mouse Gestures extension to recognize the specific mouse button (Left, Middle, Right) used for a gesture and allow different command configurations based on the button.

**Goal:** Allow users to define gestures that are unique based on the mouse button used (e.g., 'U' with Left button vs. 'U' with Right button trigger different commands).

**Default Behavior:** If the `button` property is not specified in a configuration, the gesture will match _any_ mouse button (Left, Middle, Right).

**Conflict Handling:** If conflicting configurations exist for the same gesture shape (e.g., one specifying `button: "left"` and another specifying `button: "any"` or omitting the property), a warning will be shown to the user, and no command will be executed until the conflict is resolved in `settings.json`.

---

## Phase 1: Configuration Schema Update

1.  **Modify `package.json`:**
    - Locate the `contributes.configuration.properties.mouseGestures.gestureCommands.items.properties` section.
    - Add a new property definition for `button`:
      - `type`: `"string"`
      - `enum`: `["left", "middle", "right", "any"]`
      - `default`: `"any"`
      - `description`: `"Specifies the mouse button this gesture applies to: 'left', 'middle', 'right', or 'any' (default)."`

---

## Phase 2: Webview Modifications (`webview/gesturePad.js`)

1.  **Store Initiating Button:**
    - Add a top-level variable: `let initiatingButton = null;`.
    - Modify the `mousedown` event listener:
      - Change the condition to `if (e.button === 0 || e.button === 1 || e.button === 2)`.
      - Inside the `if` block, add `initiatingButton = e.button;`.
2.  **Send Button Information:**
    - Modify the `mouseup` event listener:
      - Inside the `if (isDragging)` block, locate the `vscode.postMessage` call.
      - Add `button: initiatingButton` to the message object.
      - Reset `initiatingButton = null;` after sending the message.
3.  **Update Preview Logic (`findGestureDescriptions`):**
    - Modify function signature: `function findGestureDescriptions(sequence, inputType, button)`.
    - Update calls in `mouseup` and `wheel` handlers to pass the button number (`initiatingButton` for mouse, maybe `null` for wheel).
    - Adjust internal matching logic (`find`, loops) to consider the `button` number, prioritizing specific matches over `"any"`/unspecified. (Mapping to string names isn't strictly needed here, just consistent handling of the number vs. config).

---

## Phase 3: Extension Modifications (`src/extension.js`)

1.  **Receive Button Information & Convert:**
    - In `_handleGesture`:
      - Extract `const buttonNumber = details.button;`.
      - Add a helper function/map to convert `buttonNumber` (0, 1, 2) to string (`"left"`, `"middle"`, `"right"`). Let's call the result `buttonString`. Handle `null`/`undefined` if necessary.
2.  **Update Matching Logic (`_findGestureMatch`):**
    - Modify signature: `_findGestureMatch(gesture, commands, enablePatternMatching, inputType, buttonString)`.
    - Update the call in `_handleGesture` to pass `buttonString`.
    - **Implement New Matching Strategy:** Refactor `_findGestureMatch` (and potentially `_findPatternMatch`) to prioritize matches:
      1.  Specific `inputType` + Specific `buttonString`.
      2.  Specific `inputType` + `button` is "any"/unspecified.
      3.  `inputType` is "any"/unspecified + Specific `buttonString`.
      4.  `inputType` is "any"/unspecified + `button` is "any"/unspecified.
      - Apply this priority first for exact matches, then for pattern matches.
    - **Implement Conflict Detection:**
      - After finding the best potential match, search _all_ commands for the _same gesture sequence_ but conflicting button specificity (e.g., found match has `button: "left"`, another config has `button: "any"` or is unspecified).
      - If conflict found: Show `vscode.window.showWarningMessage` (e.g., `Ambiguous gesture configuration for '${gesture}'. Found definitions for both button '${buttonString}' and 'any' button. Please resolve in settings.json.`) and return `null` (or similar indicator).
3.  **Update "Assign Command" Flow:**
    - In `_handleGesture` (unrecognized gesture section):
      - Modify prompt message: `Gesture '${gesture}' with ${buttonString} button is not assigned. Assign a command?`
      - When creating `newBinding`, add `button: buttonString`.

---

## Phase 4: Documentation

1.  **Update `README.md`:**
    - Add section explaining the new `button` property.
    - List values (`"left"`, `"middle"`, `"right"`, `"any"`).
    - Explain default (`"any"`).
    - Describe conflict scenario (specific vs. "any"/unspecified for the same gesture) and the resulting warning/non-execution.

---

## Visual Plan (Mermaid)

```mermaid
graph TD
    A[Start: User performs gesture] --> B{Webview: mousedown};
    B --> C[Store e.button (0,1,2)];
    C --> D{Webview: mousemove};
    D --> E[Record path];
    E --> F{Webview: mouseup};
    F --> G[Process path -> sequence];
    G --> H[Send {sequence, inputType, buttonNumber} to Extension];
    H --> I{Extension: _handleGesture};
    I --> J[Convert buttonNumber -> buttonString];
    J --> K[Call _findGestureMatch(sequence, inputType, buttonString)];
    K --> L{_findGestureMatch: Find best match based on priority (inputType + button)};
    L -- Match Found --> M{Check for Conflicts (Specific vs. Any button for same gesture)};
    M -- Conflict Found --> N[Show Warning Message];
    N --> Z[End];
    M -- No Conflict --> O[Return Matched Command Config];
    O --> P{_handleGesture: Execute Command(s)};
    P --> Z;
    L -- No Match Found --> Q{Prompt User: Assign Command?};
    Q -- Yes --> R[Create new config with {sequence, inputType, buttonString}];
    R --> S[Update settings.json];
    S --> Z;
    Q -- No --> Z;

    subgraph package.json
        ConfSchema[Add 'button' property to schema]
    end

    subgraph README.md
        DocUpdate[Explain 'button' property & conflict]
    end

    style Z fill:#f9f,stroke:#333,stroke-width:2px
```
