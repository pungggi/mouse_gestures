# Change Log

## [1.1.19]

### Fixed

- **Keystroke simulation on Windows**: Fixed regression where special keys like `Enter`, `Tab`, `Escape`, arrow keys, etc. would type their literal name (e.g. "ENTER") instead of simulating the actual key press. The issue was caused by PowerShell parsing `{ENTER}` as a script block instead of a string argument.

## [1.1.18]

### Fixed

- **QuickPad multi-command registration**: Registering a new gesture via QuickPad now correctly prompts to add additional commands with sequential or parallel execution mode, matching the behavior of the standard gesture registration flow.

## [1.1.17]

### Added

- **Keystroke Simulation**: Added a new **keystroke** property for actions. You can now simulate raw key presses like **Enter**, **Tab**, or any text strings directly from a gesture.
  - **Global Input Simulation**: The `keystroke` feature leverages native OS-level tools (`powershell`, `osascript`, `xdotool`) to simulate key events. This means keystrokes now function **everywhere**, including inside Webviews, the Explorer, Terminals, and Settings UI, independent of editor focus.
  - **Fallback Display**: The Cheat Sheet now correctly identifies and labels keystroke-only actions.
  - **Flexibility**: Actions can now use either `command` or `keystroke`, making it easier to automate workflows that require physical key feedback globally.

## [1.1.16]

### Fixed

- **QuickPad assignment dialog crash**: Fixed error "Cannot read properties of undefined (reading 'editorFocus')" when assigning a new command to an unknown gesture in QuickPad. The context is now properly preserved before panel disposal.
- **`editorReadonly` context key**: Fixed incorrect behavior due to reading non-existent `document.isReadonly` API property. Now uses URI-scheme heuristic for accurate read-only detection.

### Changed

- **Button differentiation**: The `button` property now strictly differentiates gestures. If a gesture is configured with a specific button (`"left"`, `"middle"`, or `"right"`), it only matches that button. If `button` is not set, the gesture matches any mouse button. This allows the same gesture to trigger different commands depending on which mouse button is used.

### Enhanced

- **Context evaluator**: Added 16 new context keys for expanded `when` clause support, including debug state (`inDebugMode`, `debugType`, `debugState`, `debuggersAvailable`), editor state (`editorIsDirty`, `activeEditorIsDirty`, `editorLineNumber`, `isInDiffEditor`), resource paths (`resourceDirname`, `resourcePath`), editor groups (`groupEditorsCount`, `activeEditorGroupIndex`, `activeEditorGroupLast`, `activeEditorGroupEmpty`), and window state (`windowFocused`, `terminalCount`). Switched to hybrid polling + event-driven architecture for real-time context accuracy.

### Removed

- **Complex gesture patterns**: Removed regex-based pattern matching (`matchType: "pattern"`, `enablePatternMatching` setting). Gestures now use exact string matching only.

## [1.1.14]

### Added

- **QuickPad Overlay**: New ephemeral overlay that allows performing gestures directly in the active editor area

  - Press Alt+G (or "Mouse Gestures: Start QuickPad" command) to open overlay
  - Context-aware gesture mapping based on where QuickPad was invoked (editor, terminal, file type)
  - Auto-close after gesture completion or 6 seconds of inactivity
  - Press Escape to cancel overlay at any time

- **Enhanced Context Support**: QuickPad captures invocation context for intelligent gesture-to-command mapping
  - Same gesture can trigger different commands in editor vs explorer vs terminal
  - Automatic context condition generation when assigning new gestures

## [1.1.1]

### Added

- **Cheat Sheet Grouping**: Gestures in the cheat sheet are now grouped by their associated command descriptions for better organization and readability.
