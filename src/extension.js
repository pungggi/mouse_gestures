// Extension entry point
const vscode = require("vscode");

function activate(context) {
  // context here is ExtensionContext
  console.log("Mouse Gesture extension activating...");

  // Pass the extension's subscriptions array to the provider
  const provider = new GesturePadViewProvider(
    context.extensionUri,
    context.subscriptions
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GesturePadViewProvider.viewType,
      provider
    )
  );

  console.log("Gesture Pad View Provider registered.");
}

class GesturePadViewProvider {
  static viewType = "gesturePadView"; // Matches the ID in package.json

  _view = undefined; // To store the WebviewView
  _extensionUri = undefined;
  _subscriptions = undefined; // To store the main subscriptions array

  constructor(extensionUri, subscriptions) {
    // Accept subscriptions
    this._extensionUri = extensionUri;
    this._subscriptions = subscriptions; // Store subscriptions
  }

  resolveWebviewView(webviewView) {
    // Renamed context parameter to avoid confusion
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,
      // Restrict the webview to only loading content from the 'webview' directory
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, "webview")],
    };

    // Get path to script on disk
    const scriptPathOnDisk = vscode.Uri.joinPath(
      this._extensionUri,
      "webview",
      "gesturePad.js"
    );
    // And get the special URI to use with the webview
    const scriptUri = webviewView.webview.asWebviewUri(scriptPathOnDisk);

    // Set the HTML content
    webviewView.webview.html = this._getHtmlForWebview(scriptUri);

    // Send initial configuration to the webview
    this._sendConfig(webviewView.webview);

    // Listen for configuration changes and send updates
    // Use the stored subscriptions array from the main context
    this._subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration("mouseGestures.triggerButton") &&
          this._view
        ) {
          console.log("Configuration changed, sending update to webview.");
          this._sendConfig(this._view.webview);
        }
      })
    );

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      (message) => {
        console.log("Received message from webview:", message);
        switch (message.command) {
          case "gestureDetected":
            this._handleGesture(message.details); // Use class method
            return;
          // Add other cases as needed
        }
      },
      undefined,
      this._subscriptions // Use stored subscriptions
    );

    webviewView.onDidDispose(
      () => {
        console.log("Gesture Pad view disposed.");
        this._view = undefined;
      },
      null,
      this._subscriptions // Use stored subscriptions
    );

    console.log("Gesture Pad view resolved.");
  }

  // Method to send configuration to the webview
  _sendConfig(webview) {
    const config = vscode.workspace.getConfiguration("mouseGestures");
    const triggerButton = config.get("triggerButton", "right"); // Default to 'right' if not found
    webview.postMessage({ command: "setConfig", config: { triggerButton } });
    console.log(`Sent config to webview: triggerButton=${triggerButton}`);
  }

  // Method to handle gestures within the provider
  _handleGesture(details) {
    console.log("Handling gesture:", details);
    const direction = details?.direction;
    if (!direction) return;

    let commandToExecute = "";
    switch (direction) {
      case "right":
        commandToExecute = "workbench.action.nextEditor";
        break;
      case "left":
        commandToExecute = "workbench.action.previousEditor";
        break;
      // Add cases for 'up', 'down', etc.
      // case 'up': commandToExecute = 'workbench.action.scrollUp'; break;
      // case 'down': commandToExecute = 'workbench.action.scrollDown'; break;
      default:
        console.log(`No command mapped for gesture direction: ${direction}`);
        return;
    }

    if (commandToExecute) {
      vscode.commands.executeCommand(commandToExecute);
    }
  }

  // Method to generate HTML content
  _getHtmlForWebview(scriptUri) {
    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <!--
        Use a content security policy to only allow loading images from https or from our extension directory,
        and only allow scripts that have a specific nonce.
    -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gesture Pad</title>
    <style>
        body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; background-color: #252526; cursor: crosshair; }
        #gesture-area { position: relative; width: 100%; height: 100%; } /* Container for positioning canvas */
        #path-canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; } /* Canvas overlays area, doesn't block mouse */
    </style>
</head>
<body>
    <div id="gesture-area">
        <canvas id="path-canvas"></canvas>
    </div>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

// Helper function to generate nonce (keep outside the class or make static)
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function deactivate() {
  // Deactivation function
  console.log("Mouse Gesture extension deactivated.");
}

module.exports = {
  activate,
  deactivate,
};
