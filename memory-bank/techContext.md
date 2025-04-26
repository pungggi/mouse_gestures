# Technical Context: Webview Gesture Pad Approach

This document details the technologies, APIs, setup, and constraints relevant to the VS Code Gesture Pad extension project, which uses a Webview panel.

## Core Technologies

- **Extension Host:**
  - **Language:** JavaScript (using CommonJS module system - `require`/`module.exports`).
  - **Environment:** Node.js (as required by VS Code extensions).
  - **Platform:** Visual Studio Code Extension API.
- **Webview Panel:**
  - **Languages:** HTML, CSS, JavaScript (standard browser environment).

## Key VS Code APIs & Concepts (Webview Approach)

- **Extension Host Side:**
  - `require('vscode')`: Importing the VS Code API module (CommonJS).
  - `module.exports`: Exporting the `activate` and `deactivate` functions (CommonJS).
  - `vscode.window.registerWebviewViewProvider`: Registers the provider that creates and manages the webview view.
  - `vscode.WebviewViewProvider`: Interface that the `GesturePadViewProvider` class implements. Key method is `resolveWebviewView`.
  - `resolveWebviewView(webviewView, context, token)`: Method called by VS Code to render the view's content. Provides the `webviewView` object.
  - `webviewView.webview`: Accessor for the webview instance associated with the view. Used to set options (`webviewView.webview.options`), HTML (`webviewView.webview.html`), listen for messages (`webviewView.webview.onDidReceiveMessage`), and send messages (`webviewView.webview.postMessage`).
  - `webviewView.webview.asWebviewUri`: Method to generate correct URIs for loading local resources into the webview.
  - `vscode.workspace.getConfiguration`: Used to read extension settings.
  - `vscode.workspace.onDidChangeConfiguration`: Used to listen for changes to settings.
  - `vscode.commands.executeCommand`: Used by the provider to trigger VS Code actions based on messages received from the webview.
  - `context.subscriptions.push()`: Standard way to register disposables (like the view provider registration, configuration listener).
- **Webview Script Side (`webview/gesturePad.js`):**
  - **Standard DOM APIs:** `addEventListener` (for `mousedown`, `mousemove`, `mouseup`, `resize`, `contextmenu`, `message`), `getElementById`, `canvas.getContext('2d')`.
  - **Canvas API:** Used for drawing the gesture path (`clearRect`, `beginPath`, `moveTo`, `lineTo`, `stroke`).
  - **VS Code Webview API (within script):**
    - `acquireVsCodeApi()`: A function provided in the webview context to get a special `vscode` object.
    - `vscode.postMessage({ command: '...', data: ... })`: Used by the webview script to send gesture messages back to the Extension Host.

## Development Setup

- **Project Structure:** Standard VS Code extension structure, now including a `webview/` directory containing `gesturePad.js` and a `media/` directory containing `mouse.svg`. The webview HTML is generated within `src/extension.js`.
- **Build/Packaging:** Uses `vsce`. Need to ensure the `webview/` and `media/` directories and their contents are included in the packaged extension. `.vscodeignore` should now exclude `out/**` instead of `src/**` to include the compiled JavaScript.
- **Debugging:** Requires debugging both the Extension Host process (standard F5) and the Webview process (using "Developer: Open Webview Developer Tools" command).
- **Build Process (Webpack):**

  - The extension is bundled using Webpack (`webpack.config.js`) for both development and production.
  - The `copy-webpack-plugin` is used to ensure necessary static assets (like those in `webview/` and `media/`) are copied to the `dist/` directory during the build process, making them available in the packaged extension.

- **Script Automation:** - `scripts/prepublish.js`: Automates pre-publishing tasks by incrementing the patch version in `package.json` and updating the main entry point to `./dist/extension.js` to ensure the packaged version is used. - `scripts/afterpublish.js`: Handles post-publishing cleanup by reverting the main entry point in `package.json` back to `./src/extension.js` and deleting all files in the `dist` directory to maintain a clean project state.

## Technical Constraints & Challenges (Webview Approach)

- **Isolation:** The webview runs in a separate process and cannot directly access VS Code APIs or the editor state. Communication relies solely on message passing.
- **User Experience:** The primary challenge is making the interaction feel intuitive, given that gestures must occur in a separate sidebar view.
- **Panel Management:** Managed by VS Code via the `WebviewViewProvider` and the view contribution in `package.json`. The view appears in the specified Activity Bar container (`$(mouse)` icon). Activation is handled by `onView:gesturePadView`.
- **Mouse Input:** Mouse gestures can be initiated using either the left or right mouse button. This flexibility allows users to choose their preferred mouse button for gesture input.
- **Security:** Webview content must be carefully constructed to avoid security vulnerabilities (e.g., use nonces, restrict resource loading via `localResourceRoots` and CSP).
- **Performance:** Keep webview JavaScript (`webview/gesturePad.js`) efficient, especially event handling and canvas drawing.

## Dependencies

- `vscode` engine version specified in `package.json`.
