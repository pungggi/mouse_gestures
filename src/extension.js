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
    this._view = webviewView;

    // Setup configuration watcher if not already setup
    if (!this._configWatcher) {
      this._configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration("mouseGestures")) {
          this._updateConfigCache();
          if (this._view) {
            this._sendConfig(this._view.webview);
          }
        }
      });
      this._subscriptions.push(this._configWatcher);
    }

    // Configure webview options
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, "webview"),
        // Use "src" paths in development mode, "dist" in production
        vscode.Uri.joinPath(
          this._extensionUri,
          process.env.DEV_MODE === "true" ? "src" : "dist/src"
        ),
        vscode.Uri.joinPath(
          this._extensionUri,
          process.env.DEV_MODE === "true" ? "src" : "dist"
        ),
      ],
    };

    // Initialize webview content
    webviewView.webview.html = this._getHtmlForWebview(webviewView);

    // Setup message handling with performance optimization
    const messageHandler = (message) => {
      if (message.command === "gestureDetected") {
        this._handleGesture(message.details || message);
      } else if (message.command === "webviewReady") {
        // Initialize and send configuration only after webview is ready
        this._updateConfigCache();
        this._sendConfig(webviewView.webview);
      }
    };

    // Event listeners with proper cleanup
    this._subscriptions.push(
      webviewView.webview.onDidReceiveMessage(messageHandler),
      webviewView.onDidDispose(() => {
        this._view = undefined;
        // Clear config cache on dispose
        this._configCache = null;
      })
    );
  }

  // Default configuration values
  static DEFAULT_CONFIG = {
    pathColor: "#cccccc",
    pathThickness: 1,
    showGesturePreview: true,
  };

  // Cached configuration
  _configCache = null;
  _configWatcher = null;

  // Method to get gesture commands with caching
  _getGestureCommands() {
    if (!this._configCache) {
      this._updateConfigCache();
    }
    return this._configCache.gestureCommands;
  }

  // Method to update configuration cache
  _updateConfigCache() {
    const config = vscode.workspace.getConfiguration("mouseGestures");
    this._configCache = {
      gestureCommands: config.get("gestureCommands") || [],
      visualSettings: {
        pathColor:
          config.get("pathColor") ||
          GesturePadViewProvider.DEFAULT_CONFIG.pathColor,
        pathThickness:
          config.get("pathThickness") ||
          GesturePadViewProvider.DEFAULT_CONFIG.pathThickness,
        showGesturePreview: config.get("showGesturePreview") !== false,
      },
    };
  }

  // Method to send configuration to the webview
  _sendConfig(webview) {
    if (!this._configCache) {
      this._updateConfigCache();
    }

    webview.postMessage({
      command: "updateConfig",
      gestureCommands: this._configCache.gestureCommands,
      visualSettings: this._configCache.visualSettings,
    });
  }

  // Method to execute a single command
  async _executeCommand(action) {
    try {
      const result = await vscode.commands.executeCommand(
        action.command,
        ...(action.args || [])
      );
      return { success: true, result };
    } catch (error) {
      console.error(`Error executing command ${action.command}:`, error);
      return { success: false, error };
    }
  }

  // Optimized command execution strategy
  async _executeCommands(match) {
    if (match.executionMode === "parallel") {
      const results = await Promise.allSettled(
        match.actions.map((action) => this._executeCommand(action))
      );

      // Handle failures in parallel execution
      const failures = results
        .filter((r) => r.status === "rejected")
        .map((r) => r.reason);

      if (failures.length > 0) {
        console.warn("Some parallel commands failed:", failures);
      }
    } else {
      for (const action of match.actions) {
        try {
          const { success } = await this._executeCommand(action);
          if (action.waitForCompletion && !success) {
            break;
          }
        } catch (error) {
          console.error(`Command execution failed:`, error);
          if (action.waitForCompletion) break;
        }
      }
    }
  }

  // Helper method to find gesture matches with optimized matching strategy
  _findGestureMatch(gesture, commands, enablePatternMatching) {
    // Try exact match first (most common case)
    const exactMatch = commands.find((gc) => gc.gesture === gesture);
    if (exactMatch) return exactMatch;

    // Try prefix match
    const prefixMatch = commands.find(
      (gc) => gc.matchType === "prefix" && gesture.startsWith(gc.gesture)
    );
    if (prefixMatch) return prefixMatch;

    // Try pattern match last (most expensive)
    if (enablePatternMatching) {
      return this._findPatternMatch(gesture, commands);
    }

    return null;
  }

  // Optimized pattern matching with caching
  _findPatternMatch(gesture, gestureCommands) {
    const patternCommands = gestureCommands.filter(
      (gc) => gc.matchType === "pattern"
    );

    for (const command of patternCommands) {
      let regex = this._patternCache.get(command.gesture);

      if (!regex) {
        try {
          // Use the gesture string as a regex directly (allowing complex patterns)
          regex = new RegExp(command.gesture);
          this._patternCache.set(command.gesture, regex);
        } catch (e) {
          console.error(
            `Invalid regex pattern for gesture: ${command.gesture}`,
            e
          );
          continue;
        }
      }

      if (regex.test(gesture)) {
        return command;
      }
    }
    return null;
  }

  // Cached gesture map for faster lookups
  static GESTURE_MAP = {
    right: "R",
    left: "L",
    up: "U",
    down: "D",
    upright: "UR",
    upleft: "UL",
    downright: "DR",
    downleft: "DL",
  };

  // Cache for compiled regex patterns
  _patternCache = new Map();

  // Method to handle gestures within the provider
  async _handleGesture(details) {
    try {
      const direction = details?.sequence;
      if (!direction) return;

      const gesture = direction; // Use the direction code directly for command lookup
      const gestureCommands = this._getGestureCommands();
      const config = vscode.workspace.getConfiguration("mouseGestures");
      const enablePatternMatching = config.get("enablePatternMatching");

      // Try to find a match regardless of whether the gesture is in GESTURE_MAP
      const match = this._findGestureMatch(
        gesture,
        gestureCommands,
        enablePatternMatching
      );

      if (!match) {
        // Only log as unknown if no match is found at all
        console.log(
          `Unknown gesture or no commands mapped for gesture: ${gesture}`
        );
        return;
      }

      // Optimized command execution with proper error handling
      await this._executeCommands(match);
    } catch (error) {
      console.error("Error handling gesture:", error);
      vscode.window.showErrorMessage(
        `Error processing gesture: ${error.message}`
      );
    }
  }

  // Method to generate HTML content
  _getHtmlForWebview(webviewView) {
    // Get URIs for scripts, using webview URIs to ensure proper security
    const nonce = getNonce();
    const gestureRecognitionCoreUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        process.env.DEV_MODE === "true" ? "src" : "dist/src",
        "gestureRecognitionCore.js"
      )
    );
    const gesturePadUri = webviewView.webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "webview", "gesturePad.js")
    );

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <!--
        Use a content security policy that allows loading our extension resources and scripts with nonces.
    -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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

    <script nonce="${nonce}" src="${gestureRecognitionCoreUri}"></script>
    <script nonce="${nonce}" src="${gesturePadUri}"></script>
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
  console.log("Mouse Gesture extension deactivated.");
}

module.exports = {
  activate,
  deactivate,
};
