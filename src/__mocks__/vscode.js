// src/__mocks__/vscode.js
const path = require("path"); // Use actual path module for joinPath

const mockVscode = {
  workspace: {
    getConfiguration: jest.fn().mockReturnValue({
      get: jest.fn((key) => {
        if (key === "gestureCommands") return [];
        // Provide defaults for other expected configurations if necessary
        return undefined;
      }),
      update: jest.fn().mockResolvedValue(undefined),
    }),
    onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
  },
  window: {
    activeTextEditor: undefined,
    activeTerminal: undefined,
    terminals: [],
    showInformationMessage: jest.fn().mockResolvedValue(undefined),
    showErrorMessage: jest.fn(),
    showInputBox: jest.fn().mockResolvedValue(undefined),
    showQuickPick: jest.fn().mockResolvedValue(undefined),
    createWebviewPanel: jest.fn(() => ({
      webview: {
        options: {},
        html: "",
        asWebviewUri: jest.fn((uri) => uri),
        onDidReceiveMessage: jest.fn(() => ({ dispose: jest.fn() })),
        postMessage: jest.fn(),
      },
      reveal: jest.fn(),
      onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      dispose: jest.fn(),
    })),
    registerWebviewViewProvider: jest.fn(() => ({ dispose: jest.fn() })),
    // Mock any other window properties/methods used by extension.js
  },
  commands: {
    executeCommand: jest.fn().mockResolvedValue(undefined),
    registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
    getCommands: jest.fn().mockResolvedValue([]),
  },
  debug: {
    activeDebugSession: undefined,
    // Mock other debug properties/methods if used
  },
  Uri: {
    joinPath: jest.fn((base, ...paths) => {
      // A simple mock for Uri.joinPath, assuming base is an object with fsPath or similar
      // or just concatenating strings if base is a string.
      // This might need to be more sophisticated depending on actual usage.
      if (typeof base === "object" && base.fsPath) {
        return {
          scheme: base.scheme,
          fsPath: path.join(base.fsPath, ...paths),
        };
      }
      return path.join(base.toString(), ...paths);
    }),
    file: jest.fn((filePath) => ({
      scheme: "file",
      fsPath: filePath,
      with: jest.fn().mockReturnThis(), // for chaining like .with({ scheme: 'vscode-resource' })
      toString: jest.fn(() => `file://${filePath}`),
    })),
    parse: jest.fn((uriString) => {
      const parts = uriString.split("://");
      return {
        scheme: parts[0],
        fsPath: parts[1], // Simplified
        path: parts[1],
        toString: () => uriString,
        with: jest.fn().mockReturnThis(),
      };
    }),
  },
  ViewColumn: {
    One: 1,
    Two: 2,
    Beside: 3,
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
  // Add other VS Code API parts as needed by your extension
  // For example:
  // env: { appName: 'vscode' },
  // extensions: { getExtension: jest.fn() },
};

module.exports = mockVscode;
