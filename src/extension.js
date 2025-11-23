// Extension entry point
const vscode = require("vscode");
const { ContextEvaluator } = require("./contextEvaluator");


function activate(context) {
  // Wrap the find command
  context.subscriptions.push(
    vscode.commands.registerCommand("mouseGestures.actions.find", (...args) => {

      vscode.commands.executeCommand("actions.find", ...args);
    })
  );

  // Wrap the close find widget command
  context.subscriptions.push(
    vscode.commands.registerCommand("mouseGestures.closeFindWidget", (...args) => {

      vscode.commands.executeCommand("closeFindWidget", ...args);
    })
  );
  // context here is ExtensionContext

  // Store panel reference for singleton pattern
  let cheatSheetPanel = undefined;
  let quickPadPanel = undefined;
  let quickPadContext = undefined;

  // Pass the extension's subscriptions array to the provider
  const provider = new GesturePadViewProvider(
    context.extensionUri,
    context.subscriptions
  );

  // Register the webview provider and cheatSheet command
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GesturePadViewProvider.viewType,
      provider
    ),
    vscode.commands.registerCommand("mouseGestures.cheatSheet", () => {
      // Check if panel exists and isn't disposed
      if (cheatSheetPanel) {
        cheatSheetPanel.reveal(vscode.ViewColumn.One);
        return;
      }

      // Create new panel if it doesn't exist
      cheatSheetPanel = vscode.window.createWebviewPanel(
        "mouseGesturesCheatSheet",
        "Mouse Gestures Cheat Sheet",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "webview"),
          ],
          retainContextWhenHidden: true,
        }
      );

      // Get the local path to script
      const scriptPathOnDisk = vscode.Uri.joinPath(
        context.extensionUri,
        "webview",
        "cheatSheet.js"
      );
      const scriptUri = cheatSheetPanel.webview.asWebviewUri(scriptPathOnDisk);

      // Generate nonce for CSP
      const nonce = getNonce();

      cheatSheetPanel.webview.html = /*html*/ `<!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
          <title>Mouse Gestures Cheat Sheet</title>
          <style>
              body { padding: 20px; font-family: system-ui; }
              .gesture-row { display: flex; align-items: center; margin: 10px 0; padding: 10px; border-bottom: 1px solid #ccc; }
              .command-id { min-width: 200px; margin-right: 20px; }
              svg { background: #f5f5f5; border-radius: 4px; }
              svg line { stroke: var(--vscode-editor-foreground); }
              svg polygon { fill: var(--vscode-editor-foreground); }
          </style>
      </head>
      <body>
          <div id="gesture-container"></div>
          <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;

      const gestureCommands =
        vscode.workspace
          .getConfiguration("mouseGestures")
          .get("gestureCommands") || [];
      cheatSheetPanel.webview.postMessage({
        command: "loadGestures",
        data: gestureCommands,
      });

      cheatSheetPanel.webview.onDidReceiveMessage(
        async (message) => {
          let settingsJsonFound = false;
          switch (message.command) {
            case "navigateToGesture":
              // Check if settings.json is already open in any visible editor and focus it
              for (const editor of vscode.window.visibleTextEditors) {
                if (
                  editor.document.uri.fsPath.endsWith("settings.json") ||
                  editor.document.fileName.endsWith("settings.json")
                ) {
                  settingsJsonFound = true;
                  await vscode.window.showTextDocument(editor.document, {
                    viewColumn: editor.viewColumn,
                    preserveFocus: false,
                  });
                  break;
                }
              }
              // If no editor is found, open settings.json
              if (!settingsJsonFound) {
                await vscode.commands.executeCommand(
                  "workbench.action.openSettingsJson",
                  {
                    openToSide: true,
                    revealSetting: {
                      key: "mouseGestures.gestureCommands",
                      edit: false,
                    },
                  }
                );
              }

              let searchText; // eslint-disable-line no-case-declarations
              let isSearchingByDescription = false; // eslint-disable-line no-case-declarations

              // Strategy 1: If we have an action description, search for that first
              if (
                message.actionDescription &&
                message.actionDescription.length > 0
              ) {
                searchText = `"description": "${message.actionDescription}"`;
                isSearchingByDescription = true;
                console.log(
                  `Searching by action description: ${message.actionDescription}`
                );
              } else {
                // Strategy 2: Fallback to gesture search
                searchText = `"gesture": "${message.gestureId}"`;
                isSearchingByDescription = false;
                console.log(`Searching by gesture name: ${message.gestureId}`);
              }

              // Start the find action
              await vscode.commands.executeCommand("mouseGestures.actions.find");

              // Set the search text (plain text, not regex)
              await vscode.commands.executeCommand(
                "editor.actions.findWithArgs",
                {
                  searchString: searchText,
                  isRegex: false,
                  matchCase: false,
                  matchWholeWord: false,
                  preserveCase: false,
                }
              );

              let matchFound = false; // eslint-disable-line no-case-declarations
              let attempts = 0; // eslint-disable-line no-case-declarations
              const maxAttempts = 20; // eslint-disable-line no-case-declarations

              try {
                await vscode.commands.executeCommand(
                  "editor.action.nextMatchFindAction"
                );

                while (attempts < maxAttempts) {
                  const editor = vscode.window.activeTextEditor;
                  if (!editor) break;

                  const position = editor.selection.active;
                  const line = editor.document.lineAt(position.line);
                  const lineText = line.text.trim();

                  // Skip commented lines
                  if (lineText.startsWith("//")) {
                    attempts++;
                    try {
                      await vscode.commands.executeCommand(
                        "editor.action.nextMatchFindAction"
                      );
                      continue;
                    } catch {
                      break; // No more matches
                    }
                  }

                  if (isSearchingByDescription) {
                    // When searching by description, we found the exact action
                    // Just verify it's not commented and we're done
                    matchFound = true;
                    console.log(`Found exact match by action description`);
                    break;
                  } else {
                    // When searching by gesture, use the original context analysis
                    // Check the context around this match (next 15 lines)
                    const startLine = position.line;
                    const endLine = Math.min(
                      editor.document.lineCount - 1,
                      position.line + 15
                    );
                    let contextText = "";

                    for (let i = startLine; i <= endLine; i++) {
                      contextText += editor.document.lineAt(i).text + "\n";
                    }

                    // Score this match based on how well it matches our criteria
                    let score = 1; // Base score for finding the gesture
                    let isValidMatch = true;

                    // Check inputType matching
                    if (message.inputType && message.inputType !== "any") {
                      if (
                        contextText.includes(
                          `"inputType": "${message.inputType}"`
                        )
                      ) {
                        score += 10; // Exact inputType match
                      } else if (contextText.includes('"inputType":')) {
                        // Has different inputType, this is probably not our match
                        isValidMatch = false;
                      } else {
                        // No inputType specified, could be our match if inputType is "mouse" or "any"
                        if (
                          message.inputType === "mouse" ||
                          message.inputType === "any"
                        ) {
                          score += 5; // Partial match
                        } else {
                          isValidMatch = false;
                        }
                      }
                    } else {
                      // We're looking for "any" inputType, prefer matches without explicit inputType
                      if (!contextText.includes('"inputType":')) {
                        score += 5;
                      }
                    }

                    // Check group matching
                    if (message.group) {
                      if (contextText.includes(`"group": "${message.group}"`)) {
                        score += 10; // Exact group match
                      } else {
                        score -= 5; // Group mismatch
                      }
                    }

                    // If this is a valid match with decent score, use it
                    if (isValidMatch && score >= 5) {
                      matchFound = true;
                      console.log(`Found gesture match with score: ${score}`);
                      break;
                    }
                  }

                  // Try next match
                  attempts++;
                  try {
                    await vscode.commands.executeCommand(
                      "editor.action.nextMatchFindAction"
                    );
                  } catch {
                    break; // No more matches
                  }
                }
              } catch (error) {
                console.warn("Search failed:", error.message);
              }

              // If no match found, show appropriate message
              if (!matchFound) {
                if (isSearchingByDescription) {
                  if (attempts >= maxAttempts) {
                    vscode.window.showWarningMessage(
                      `Found action description "${message.actionDescription}" but all matches appear to be commented out.`
                    );
                  } else {
                    vscode.window.showErrorMessage(
                      `Could not find action description "${message.actionDescription}" in settings.json.`
                    );
                  }
                } else {
                  if (attempts >= maxAttempts) {
                    vscode.window.showWarningMessage(
                      `Found gesture "${message.gestureId}" but all matches appear to be commented out or don't match the criteria.`
                    );
                  } else {
                    vscode.window.showErrorMessage(
                      `Could not find gesture "${message.gestureId}" in settings.json.`
                    );
                  }
                }
              }

              return;
          }
        },
        undefined,
        context.subscriptions
      );

      cheatSheetPanel.onDidDispose(
        () => {
          // Reset panel reference when disposed
          cheatSheetPanel = undefined;
        },
        null,
        context.subscriptions
      );
    }),
    vscode.commands.registerCommand("mouseGestures.startQuickPad", async () => {
      if (quickPadPanel) {
        quickPadPanel.reveal(vscode.ViewColumn.Active);
        return;
      }

      // Capture context before focus changes
      quickPadContext = await provider._captureContext();

      // Create ephemeral QuickPad panel
      quickPadPanel = vscode.window.createWebviewPanel(
        "mouseGesturesQuickPad",
        "QuickPad",
        vscode.ViewColumn.Active,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.joinPath(context.extensionUri, "webview"),
            vscode.Uri.joinPath(
              context.extensionUri,
              process.env.DEV_MODE === "true" ? "src" : "dist/src"
            ),
            vscode.Uri.joinPath(
              context.extensionUri,
              process.env.DEV_MODE === "true" ? "src" : "dist"
            ),
          ],
          retainContextWhenHidden: false,
        }
      );

      // Get URIs for scripts
      const nonce = getNonce();
      const gestureRecognitionCoreUri = quickPadPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(
          context.extensionUri,
          process.env.DEV_MODE === "true" ? "src" : "dist/src",
          "gestureRecognitionCore.js"
        )
      );
      const gesturePadUri = quickPadPanel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, "webview", "gesturePad.js")
      );

      // Generate HTML for QuickPad overlay
      quickPadPanel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body, html { 
            margin: 0; 
            padding: 0; 
            height: 100%; 
            overflow: hidden; 
            background-color: rgba(37, 37, 37, 0.85); 
            cursor: crosshair; 
            font-family: var(--vscode-font-family);
        }
        #gesture-area { 
            position: relative; 
            width: 100%; 
            height: 100%; 
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #path-canvas { 
            position: absolute; 
            top: 0; 
            left: 0; 
            width: 100%; 
            height: 100%; 
            pointer-events: none; 
        }
        #hint {
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: #ffffff;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            opacity: 0.8;
        }
        .reticle {
            position: absolute;
            width: 40px;
            height: 40px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            pointer-events: none;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.1); opacity: 0.6; }
            100% { transform: scale(1); opacity: 0.3; }
        }
    </style>
</head>
<body>
    <div id="gesture-area">
        <canvas id="path-canvas"></canvas>
        <div class="reticle"></div>
        <div id="hint">Draw a gesture • Press Escape to cancel</div>
    </div>

    <script nonce="${nonce}" src="${gestureRecognitionCoreUri}"></script>
    <script nonce="${nonce}" src="${gesturePadUri}"></script>
</body>
</html>`;

      // Send initial configuration
      const config = vscode.workspace.getConfiguration("mouseGestures");
      quickPadPanel.webview.postMessage({
        command: "updateConfig",
        visualSettings: {
          pathColor: config.get("pathColor") || "#cccccc",
          pathThickness: config.get("pathThickness") || 1,
          showGesturePreview: config.get("showGesturePreview") !== false,
        },
        quickPadSettings: {
          autoClose: config.get("quickPad.autoClose") !== false,
          inactivityTimeoutMs:
            config.get("quickPad.inactivityTimeoutMs") || 6000,
          showHint: config.get("quickPad.showHint") !== false,
        },
        overlayMode: true,
      });

      // Setup message handling
      const messageHandler = async (message) => {
        if (message.command === "gestureDetected") {
          // Close the panel FIRST to restore focus
          if (config.get("quickPad.autoClose") !== false && quickPadPanel) {
            quickPadPanel.dispose();
            quickPadPanel = undefined;
            quickPadContext = undefined;

            // Wait a bit for focus to return to the original editor
            await new Promise((resolve) => setTimeout(resolve, 50));
          }

          // THEN execute the command with focus restored
          await provider._handleQuickPadGesture(
            message.details || message,
            quickPadContext
          );
        } else if (message.command === "cancelQuickPad") {
          if (quickPadPanel) {
            quickPadPanel.dispose();
            quickPadPanel = undefined;
            quickPadContext = undefined;
          }
        }
      };

      quickPadPanel.webview.onDidReceiveMessage(messageHandler);

      // Auto-close on inactivity
      const timeoutMs = config.get("quickPad.inactivityTimeoutMs") || 6000;
      let timeoutHandle = setTimeout(() => {
        if (quickPadPanel) {
          quickPadPanel.dispose();
          quickPadPanel = undefined;
          quickPadContext = undefined;
        }
      }, timeoutMs);

      // Reset timeout on any activity
      const resetTimeout = () => {
        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(() => {
          if (quickPadPanel) {
            quickPadPanel.dispose();
            quickPadPanel = undefined;
            quickPadContext = undefined;
          }
        }, timeoutMs);
      };

      quickPadPanel.webview.onDidReceiveMessage(resetTimeout);

      quickPadPanel.onDidDispose(() => {
        clearTimeout(timeoutHandle);
        quickPadPanel = undefined;
        quickPadContext = undefined;
      });
    }),
    vscode.commands.registerCommand("mouseGestures.cancelQuickPad", () => {
      if (quickPadPanel) {
        quickPadPanel.dispose();
        quickPadPanel = undefined;
        quickPadContext = undefined;
      }
    })
  );
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
    this._contextEvaluator = new ContextEvaluator();
  }

  // Capture context snapshot for QuickPad
  async _captureContext() {
    const activeEditor = vscode.window.activeTextEditor;
    const activeTerminal = vscode.window.activeTerminal;

    return {
      editorFocus: !!activeEditor,
      editorLangId: activeEditor?.document?.languageId,
      resourceScheme: activeEditor?.document?.uri?.scheme,
      resourceFilename: activeEditor?.document?.fileName
        ? require("path").basename(activeEditor.document.fileName)
        : undefined,
      terminalFocus: !!activeTerminal,
      timestamp: Date.now(),
    };
  }

  // Handle QuickPad gestures with context
  async _handleQuickPadGesture(details, context) {
    try {
      const direction = details?.sequence;
      if (!direction) return;

      const gesture = direction;
      const gestureCommands = this._getGestureCommands();
      const config = vscode.workspace.getConfiguration("mouseGestures");
      const enablePatternMatching = config.get("enablePatternMatching");

      console.log(
        `QuickPad: Processing gesture "${gesture}" with ${gestureCommands.length} commands`
      );
      console.log(`QuickPad: Captured context:`, context);

      const inputType = details.inputType || "mouse";
      let buttonStr = "left";
      if (details.button === 0) buttonStr = "left";
      else if (details.button === 1) buttonStr = "middle";
      else if (details.button === 2) buttonStr = "right";

      if (inputType === "wheel") {
        buttonStr = undefined;
      }

      console.log(
        `QuickPad: Looking for gesture="${gesture}", inputType="${inputType}", button="${buttonStr}"`
      );

      // Find gesture match with context awareness
      const match = await this._findGestureMatchWithContext(
        gesture,
        gestureCommands,
        enablePatternMatching,
        inputType,
        buttonStr,
        context
      );

      console.log(
        `QuickPad: Match found:`,
        match ? `Yes (${match.gesture})` : "No"
      );

      if (!match) {
        // Show context-aware prompt
        const contextHint = context.editorFocus
          ? context.editorLangId
            ? ` in ${context.editorLangId} file`
            : " in editor"
          : context.terminalFocus
          ? " in terminal"
          : "";

        const assignOption = "Assign Command";
        const cancelOption = "Cancel";
        let message = inputType === "wheel" ? "Wheel" : "Gesture";
        message += ` '${gesture}'${contextHint} is not recognized. Assign a command?`;

        const response = await vscode.window.showInformationMessage(
          message,
          assignOption,
          cancelOption
        );

        if (response === assignOption) {
          const selectedCommand = await this._selectCommand();
          if (selectedCommand) {
            const description = await vscode.window.showInputBox({
              prompt: "Enter a description for this gesture (optional):",
              placeHolder: "Leave blank to skip",
              ignoreFocusOut: true,
            });

            const newBinding = {
              gesture: gesture,
              inputType: inputType,
              button: buttonStr,
              actions: [
                { command: selectedCommand, description: description || "" },
              ],
              // Add context condition based on where QuickPad was invoked
              when: context.editorFocus
                ? context.editorLangId
                  ? `editorLangId == "${context.editorLangId}"`
                  : "editorTextFocus"
                : context.terminalFocus
                ? "terminalFocus"
                : undefined,
            };

            // Update settings
            const currentBindings = config.get("gestureCommands") || [];
            const updatedBindings = [...currentBindings, newBinding];

            try {
              await config.update(
                "gestureCommands",
                updatedBindings,
                vscode.ConfigurationTarget.Global
              );
              this._updateConfigCache();
            } catch (error) {
              console.error("Error updating gesture bindings:", error);
              vscode.window.showErrorMessage(
                `Failed to update gesture bindings: ${error.message}`
              );
            }
          }
        }
        return;
      }

      console.log(
        `QuickPad: Executing commands for gesture "${match.gesture}":`,
        match.actions
      );
      await this._executeCommands(match);
      console.log(`QuickPad: Commands executed successfully`);
    } catch (error) {
      console.error("Error handling QuickPad gesture:", error);
      vscode.window.showErrorMessage(
        `Error processing gesture: ${error.message}`
      );
    }
  }

  // Find gesture match with context awareness using captured context
  async _findGestureMatchWithContext(
    gesture,
    commands,
    enablePatternMatching,
    inputType,
    buttonStr,
    capturedContext
  ) {
    // For wheel input, only match commands explicitly defined with inputType: "wheel"
    if (inputType === "wheel") {
      for (const gc of commands) {
        if (gc.gesture === gesture && gc.inputType === "wheel") {
          if (await this._isContextMatchWithCaptured(gc, capturedContext)) {
            return gc;
          }
        }
      }
      if (enablePatternMatching) {
        return await this._findPatternMatchWithCaptured(
          gesture,
          commands,
          inputType,
          buttonStr,
          capturedContext
        );
      }
      return null;
    }

    // Try exact match with specific inputType and button, checking context
    for (const gc of commands) {
      if (
        gc.gesture === gesture &&
        gc.inputType === inputType &&
        gc.button === buttonStr
      ) {
        if (await this._isContextMatchWithCaptured(gc, capturedContext)) {
          return gc;
        }
      }
    }

    // Then try exact match with specific inputType and default button 'left' if buttonStr is not 'left'
    if (buttonStr !== "left") {
      for (const gc of commands) {
        if (
          gc.gesture === gesture &&
          gc.inputType === inputType &&
          gc.button === "left"
        ) {
          if (await this._isContextMatchWithCaptured(gc, capturedContext)) {
            return gc;
          }
        }
      }
    }

    // Then try exact match with any/unspecified inputType and specific button
    for (const gc of commands) {
      if (gc.gesture === gesture && !gc.inputType && gc.button === buttonStr) {
        if (await this._isContextMatchWithCaptured(gc, capturedContext)) {
          return gc;
        }
      }
    }

    // Then try exact match with any/unspecified inputType and default button 'left' if buttonStr is not 'left'
    if (buttonStr !== "left") {
      for (const gc of commands) {
        if (gc.gesture === gesture && !gc.inputType && gc.button === "left") {
          if (await this._isContextMatchWithCaptured(gc, capturedContext)) {
            return gc;
          }
        }
      }
    }

    // Finally, try matches with unspecified button, defaulting to 'left'
    for (const gc of commands) {
      if (gc.gesture === gesture && !gc.inputType && !gc.button) {
        if (await this._isContextMatchWithCaptured(gc, capturedContext)) {
          return gc;
        }
      }
    }

    // Try pattern match last (most expensive)
    if (enablePatternMatching) {
      return await this._findPatternMatchWithCaptured(
        gesture,
        commands,
        inputType,
        buttonStr,
        capturedContext
      );
    }

    return null;
  }

  // Check if gesture command matches using captured context instead of current context
  async _isContextMatchWithCaptured(gestureCommand, capturedContext) {
    if (!gestureCommand.when) {
      return true; // No context condition means always active
    }

    // For simple editorLangId checks, use the captured context directly
    const whenClause = gestureCommand.when.trim();

    // Handle editorLangId == "language" pattern
    const langIdMatch = whenClause.match(
      /editorLangId\s*==\s*["']([^"']+)["']/
    );
    if (langIdMatch) {
      const requiredLangId = langIdMatch[1];
      return capturedContext.editorLangId === requiredLangId;
    }

    // Handle editorTextFocus
    if (whenClause === "editorTextFocus") {
      return capturedContext.editorFocus;
    }

    // Handle terminalFocus
    if (whenClause === "terminalFocus") {
      return capturedContext.terminalFocus;
    }

    // For complex when clauses, fall back to the context evaluator
    // (which will check current state, not captured state)
    try {
      return await this._contextEvaluator.evaluate(gestureCommand.when);
    } catch (error) {
      console.error(
        `Error evaluating context for gesture "${gestureCommand.gesture}":`,
        error
      );
      return false;
    }
  }

  // Pattern matching with captured context
  async _findPatternMatchWithCaptured(
    gesture,
    gestureCommands,
    inputType,
    buttonStr,
    capturedContext
  ) {
    const patternCommands = gestureCommands.filter(
      (gc) => gc.matchType === "pattern"
    );

    // For wheel input, only match patterns explicitly defined with inputType: "wheel"
    if (inputType === "wheel") {
      for (const command of patternCommands) {
        if (command.inputType === "wheel") {
          try {
            const regex = new RegExp(command.gesture);
            if (
              regex.test(gesture) &&
              (await this._isContextMatchWithCaptured(command, capturedContext))
            ) {
              return command;
            }
          } catch (error) {
            console.error(`Invalid regex pattern: ${command.gesture}`, error);
          }
        }
      }
      return null;
    }

    // Try pattern matches with specific inputType and specific button
    for (const command of patternCommands) {
      if (command.inputType === inputType && command.button === buttonStr) {
        try {
          const regex = new RegExp(command.gesture);
          if (
            regex.test(gesture) &&
            (await this._isContextMatchWithCaptured(command, capturedContext))
          ) {
            return command;
          }
        } catch (error) {
          console.error(`Invalid regex pattern: ${command.gesture}`, error);
        }
      }
    }

    // Try with default button 'left' if buttonStr is not 'left'
    if (buttonStr !== "left") {
      for (const command of patternCommands) {
        if (command.inputType === inputType && command.button === "left") {
          try {
            const regex = new RegExp(command.gesture);
            if (
              regex.test(gesture) &&
              (await this._isContextMatchWithCaptured(command, capturedContext))
            ) {
              return command;
            }
          } catch (error) {
            console.error(`Invalid regex pattern: ${command.gesture}`, error);
          }
        }
      }
    }

    // Try with any/unspecified inputType and specific button
    for (const command of patternCommands) {
      if (!command.inputType && command.button === buttonStr) {
        try {
          const regex = new RegExp(command.gesture);
          if (
            regex.test(gesture) &&
            (await this._isContextMatchWithCaptured(command, capturedContext))
          ) {
            return command;
          }
        } catch (error) {
          console.error(`Invalid regex pattern: ${command.gesture}`, error);
        }
      }
    }

    // Try with any/unspecified inputType and default button 'left'
    if (buttonStr !== "left") {
      for (const command of patternCommands) {
        if (!command.inputType && command.button === "left") {
          try {
            const regex = new RegExp(command.gesture);
            if (
              regex.test(gesture) &&
              (await this._isContextMatchWithCaptured(command, capturedContext))
            ) {
              return command;
            }
          } catch (error) {
            console.error(`Invalid regex pattern: ${command.gesture}`, error);
          }
        }
      }
    }

    // Finally, try matches with unspecified button
    for (const command of patternCommands) {
      if (!command.inputType && !command.button) {
        try {
          const regex = new RegExp(command.gesture);
          if (
            regex.test(gesture) &&
            (await this._isContextMatchWithCaptured(command, capturedContext))
          ) {
            return command;
          }
        } catch (error) {
          console.error(`Invalid regex pattern: ${command.gesture}`, error);
        }
      }
    }

    return null;
  }

  // Pattern matching with context awareness
  async _findPatternMatchWithContext(
    gesture,
    gestureCommands,
    inputType,
    buttonStr,
    context
  ) {
    const patternCommands = gestureCommands.filter(
      (gc) => gc.matchType === "pattern"
    );

    for (const command of patternCommands) {
      if (command.inputType === inputType && command.button === buttonStr) {
        try {
          const regex = new RegExp(command.gesture);
          if (
            regex.test(gesture) &&
            (await this._isContextMatchWithCaptured(command, context))
          ) {
            return command;
          }
        } catch (error) {
          console.error(`Invalid regex pattern: ${command.gesture}`, error);
        }
      }
    }

    return null;
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
          await this._executeCommand(action);
        } catch (error) {
          console.error(`Command execution failed:`, error);
        }
        if (action.waitSeconds > 0) {
          const sleep = (ms) =>
            new Promise((resolve) => setTimeout(resolve, ms));
          await sleep(action.waitSeconds * 1000);
        }
      }
    }
  }

  // Helper method to find gesture matches with optimized matching strategy
  async _findGestureMatch(
    gesture,
    commands,
    enablePatternMatching,
    inputType,
    buttonStr
  ) {
    // For wheel input, only match commands explicitly defined with inputType: "wheel"
    if (inputType === "wheel") {
      for (const gc of commands) {
        if (gc.gesture === gesture && gc.inputType === "wheel") {
          if (await this._isContextMatch(gc)) {
            return gc;
          }
        }
      }
      // No fallback to 'any' or unspecified inputType for wheel
      if (enablePatternMatching) {
        return await this._findPatternMatch(
          gesture,
          commands,
          inputType,
          buttonStr
        );
      }
      return null;
    }

    // Try exact match with specific inputType and button, checking context
    for (const gc of commands) {
      if (
        gc.gesture === gesture &&
        gc.inputType === inputType &&
        gc.button === buttonStr
      ) {
        if (await this._isContextMatch(gc)) {
          return gc;
        }
      }
    }

    // Then try exact match with specific inputType and default button 'left' if buttonStr is not 'left'
    if (buttonStr !== "left") {
      for (const gc of commands) {
        if (
          gc.gesture === gesture &&
          gc.inputType === inputType &&
          gc.button === "left"
        ) {
          if (await this._isContextMatch(gc)) {
            return gc;
          }
        }
      }
    }

    // Then try exact match with any/unspecified inputType and specific button
    for (const gc of commands) {
      if (gc.gesture === gesture && !gc.inputType && gc.button === buttonStr) {
        if (await this._isContextMatch(gc)) {
          return gc;
        }
      }
    }

    // Then try exact match with any/unspecified inputType and default button 'left' if buttonStr is not 'left'
    if (buttonStr !== "left") {
      for (const gc of commands) {
        if (gc.gesture === gesture && !gc.inputType && gc.button === "left") {
          if (await this._isContextMatch(gc)) {
            return gc;
          }
        }
      }
    }

    // Finally, try matches with unspecified button, defaulting to 'left'
    for (const gc of commands) {
      if (gc.gesture === gesture && !gc.inputType && !gc.button) {
        if (await this._isContextMatch(gc)) {
          return gc;
        }
      }
    }

    // Try pattern match last (most expensive)
    if (enablePatternMatching) {
      return await this._findPatternMatch(
        gesture,
        commands,
        inputType,
        buttonStr
      );
    }

    return null;
  }

  // No longer needed since 'any' is removed and button is mandatory with default 'left'
  // Conflict checking is simplified by always requiring a specific button or defaulting to 'left'

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

  // Helper method to check if a gesture command matches to current context
  async _isContextMatch(gestureCommand) {
    if (!gestureCommand.when) {
      return true; // No context condition means always active
    }

    try {
      return await this._contextEvaluator.evaluate(gestureCommand.when);
    } catch (error) {
      console.error(
        `Error evaluating context for gesture "${gestureCommand.gesture}":`,
        error
      );
      return false; // Default to false on error
    }
  }

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
      const inputType = details.inputType || "mouse"; // Default to mouse if not specified
      // Convert button number to string, default to 'left' if not specified
      let buttonStr = "left";
      if (details.button === 0) buttonStr = "left";
      else if (details.button === 1) buttonStr = "middle";
      else if (details.button === 2) buttonStr = "right";

      // ignore buttonStr for wheel input
      if (inputType === "wheel") {
        buttonStr = undefined; // Ignore button for wheel input
      }

      const match = await this._findGestureMatch(
        gesture,
        gestureCommands,
        enablePatternMatching,
        inputType,
        buttonStr
      );

      if (!match) {
        // Prompt user to assign a command to the unrecognized gesture
        const assignOption = "Assign Command";
        const cancelOption = "Cancel";
        let message = inputType === "wheel" ? "Wheel" : "Gesture";
        message += ` '${gesture}'${
          buttonStr ? ` with ${buttonStr} button` : ""
        } is not recognized. Assign a command?`;

        const response = await vscode.window.showInformationMessage(
          message,
          assignOption,
          cancelOption
        );
        if (response === assignOption) {
          const selectedCommand = await this._selectCommand();
          if (selectedCommand) {
            // Prompt for an optional description
            const description = await vscode.window.showInputBox({
              prompt: "Enter a description for this gesture (optional):",
              placeHolder: "Leave blank to skip",
              ignoreFocusOut: true,
            });

            const newBinding = {
              gesture: gesture,
              inputType: inputType,
              button: buttonStr,
              actions: [
                { command: selectedCommand, description: description || "" },
              ],
            };

            // Loop to add multiple commands
            while (true) {
              const addMore = await vscode.window.showQuickPick(
                ["No", "Parallel", "Sequential"],
                {
                  placeHolder:
                    "Do you want to add another command to this gesture?",
                  ignoreFocusOut: true,
                }
              );

              if (addMore === "No" || !addMore) {
                break;
              }

              newBinding.executionMode = addMore.toLowerCase();

              const additionalCommand = await this._selectCommand();
              if (additionalCommand) {
                newBinding.actions.push({
                  command: additionalCommand,
                  description: "",
                });
              } else {
                break;
              }
            }

            // Update the global settings with the new gesture-command mapping
            const config = vscode.workspace.getConfiguration("mouseGestures");
            const currentBindings = config.get("gestureCommands") || [];
            const updatedBindings = [...currentBindings, newBinding];
            try {
              await config.update(
                "gestureCommands",
                updatedBindings,
                vscode.ConfigurationTarget.Global
              );
              // Log the current state of settings after update to verify
              const updatedConfig =
                vscode.workspace.getConfiguration("mouseGestures");
              updatedConfig.get("gestureCommands") || [];
            } catch (error) {
              console.error("Error updating gesture bindings:", error);
              vscode.window.showErrorMessage(
                `Failed to update gesture bindings: ${error.message}`
              );
            }
            // Update the config cache and send to webview
            this._updateConfigCache();
            if (this._view) {
              this._sendConfig(this._view.webview);
            }
          }
        }
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

  // Method to show a Quick Pick UI for selecting a VS Code command
  async _selectCommand() {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = "Search for a VS Code command...";
    quickPick.canSelectMany = false;
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    // Fetch all available command IDs
    const commandIds = await vscode.commands.getCommands(true);
    quickPick.items = commandIds.map((id) => ({
      label: id,
    }));

    return new Promise((resolve) => {
      let selectedCommand = undefined;
      quickPick.onDidAccept(() => {
        const selected = quickPick.selectedItems[0];
        selectedCommand = selected ? selected.label : undefined;
        quickPick.dispose();
        resolve(selectedCommand);
      });
      quickPick.onDidHide(() => {
        quickPick.dispose();
        // Only resolve with undefined if no selection was made
        if (selectedCommand === undefined) {
          resolve(undefined);
        }
        // If a selection was made, do not override it
      });
      quickPick.show();
    });
  }

  // Optimized pattern matching with caching
  async _findPatternMatch(gesture, gestureCommands, inputType, buttonStr) {
    const patternCommands = gestureCommands.filter(
      (gc) => gc.matchType === "pattern"
    );

    // For wheel input, only match patterns explicitly defined with inputType: "wheel"
    if (inputType === "wheel") {
      for (const command of patternCommands) {
        // Ignore button for wheel pattern matching
        if (command.inputType === "wheel") {
          let regex = this._patternCache.get(command.gesture);

          if (!regex) {
            try {
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

          if (regex.test(gesture) && (await this._isContextMatch(command))) {
            return command;
          }
        }
      }
      // No fallback to 'any' or unspecified inputType for wheel
      return null;
    }

    // Original logic for other input types (like mouse)
    // First, try pattern matches with specific inputType and specific button
    for (const command of patternCommands) {
      if (command.inputType === inputType && command.button === buttonStr) {
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

        if (regex.test(gesture) && (await this._isContextMatch(command))) {
          return command;
        }
      }
    }

    // Then, try pattern matches with specific inputType and default button 'left' if buttonStr is not 'left'
    if (buttonStr !== "left") {
      for (const command of patternCommands) {
        if (command.inputType === inputType && command.button === "left") {
          let regex = this._patternCache.get(command.gesture);

          if (!regex) {
            try {
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

          if (regex.test(gesture) && (await this._isContextMatch(command))) {
            return command;
          }
        }
      }
    }

    // Then, try pattern matches with any/unspecified inputType and specific button
    for (const command of patternCommands) {
      if (!command.inputType && command.button === buttonStr) {
        let regex = this._patternCache.get(command.gesture);

        if (!regex) {
          try {
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

        if (regex.test(gesture) && (await this._isContextMatch(command))) {
          return command;
        }
      }
    }

    // Then, try pattern matches with any/unspecified inputType and default button 'left' if buttonStr is not 'left'
    if (buttonStr !== "left") {
      for (const command of patternCommands) {
        if (!command.inputType && command.button === "left") {
          let regex = this._patternCache.get(command.gesture);

          if (!regex) {
            try {
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

          if (regex.test(gesture) && (await this._isContextMatch(command))) {
            return command;
          }
        }
      }
    }

    // Finally, try matches with unspecified button, defaulting to 'left'
    for (const command of patternCommands) {
      if (!command.inputType && !command.button) {
        let regex = this._patternCache.get(command.gesture);

        if (!regex) {
          try {
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

        if (regex.test(gesture) && (await this._isContextMatch(command))) {
          return command;
        }
      }
    }
    return null;
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

// Helper function to generate nonce (keep outside of class or make static)
function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
