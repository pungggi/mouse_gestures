const vscode = require("vscode");

/**
 * Extension activation handler
 * @param {vscode.ExtensionContext} context - Extension context
 */
function activate(context) {
  try {
    registerTaskEvents(context);
    console.log(" extension activated successfully");
  } catch (error) {
    console.error("Error during extension activation:", error);
    vscode.window.showErrorMessage(
      `Error activating  extension: ${error.message}`
    );
  }
}

/**
 * Extension deactivation handler
 */
function deactivate() {
  console.log(" extension deactivated");
}

module.exports = {
  activate,
  deactivate,
};
