const assert = require('assert');
const vscode = require('vscode');
const sinon = require('sinon');
const path = require('path');
const os = require('os');
const fs = require('fs').promises;

// Import the class to be tested
const { GesturePadViewProvider } = require('../../src/extension'); // Adjust path as needed

suite('Gesture Context When Clause Tests', () => {
  let viewProvider;
  let executeCommandSpy;
  let originalConfiguration = {};
  let testTextEditor;
  let testTerminal;
  let dummyFileUri;

  // Dummy commands for testing
  const testCommands = [
    'test.command.langone', 'test.command.global', 'test.command.terminal',
    'test.command.globalfortd', 'test.command.debug', 'test.command.nodebug',
    'test.command.andcondition', 'test.command.orcondition', 'test.command.notconditions'
  ];
  const commandDisposables = [];

  suiteSetup(async () => {
    // Ensure extension is activated
    const extension = vscode.extensions.getExtension('ngSoftware.mouse-gestures'); // Replace with your extension's ID
    if (!extension.isActive) {
      await extension.activate();
    }

    // Register dummy commands
    testCommands.forEach(cmdId => {
      commandDisposables.push(vscode.commands.registerCommand(cmdId, () => {
        // This function will be spied on, so its body doesn't matter much
        // console.log(`Dummy command ${cmdId} executed`);
      }));
    });

    // Create a dummy file URI for text editors
    const tempDir = os.tmpdir();
    const dummyFilePath = path.join(tempDir, 'mouse-gestures-test-dummy.txt');
    await fs.writeFile(dummyFilePath, 'Hello from test');
    dummyFileUri = vscode.Uri.file(dummyFilePath);

  });

  setup(async () => { // Renamed from beforeEach to setup for Mocha TDD interface
    // Create an instance of the view provider
    // For constructor: GesturePadViewProvider(extensionUri, subscriptions)
    // We can pass minimal mocks/stubs if full functionality isn't needed for these tests
    const mockExtensionUri = vscode.Uri.file(path.resolve(__dirname, '../../'));
    const mockSubscriptions = [];
    viewProvider = new GesturePadViewProvider(mockExtensionUri, mockSubscriptions);

    // Spy on vscode.commands.executeCommand
    executeCommandSpy = sinon.spy(vscode.commands, 'executeCommand');

    // Store original configuration to restore later
    const config = vscode.workspace.getConfiguration('mouseGestures');
    originalConfiguration.gestureCommands = config.inspect('gestureCommands').globalValue;
    if (originalConfiguration.gestureCommands === undefined) {
        originalConfiguration.gestureCommands = config.inspect('gestureCommands').defaultValue;
    }
    
    // Reset configuration to empty array
    await config.update('gestureCommands', [], vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache(); // Ensure cache is updated
  });

  teardown(async () => { // Renamed from afterEach to teardown
    executeCommandSpy.restore();

    // Restore original configuration
    const config = vscode.workspace.getConfiguration('mouseGestures');
    await config.update('gestureCommands', originalConfiguration.gestureCommands, vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache();

    if (testTextEditor) {
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      testTextEditor = undefined;
    }
    if (testTerminal) {
      testTerminal.dispose();
      testTerminal = undefined;
      // Add a small delay for terminal disposal to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    // Ensure no debug session is active
    if (vscode.debug.activeDebugSession) {
        await vscode.debug.stopDebugging();
        // Wait for debug session to fully terminate
        await new Promise(resolve => {
            const disposable = vscode.debug.onDidTerminateDebugSession(() => {
                disposable.dispose();
                resolve();
            });
            // If it's already stopped, resolve immediately
            if (!vscode.debug.activeDebugSession) {
                 disposable.dispose();
                 resolve();
            }
        });
    }
  });

  suiteTeardown(async () => {
    commandDisposables.forEach(d => d.dispose());
    if (dummyFileUri) {
        try {
            await fs.unlink(dummyFileUri.fsPath);
        } catch (err) {
            console.error("Error deleting dummy file:", err);
        }
    }
  });

  test('Test Case 1: editorLangId specific gesture', async () => {
    const config = vscode.workspace.getConfiguration('mouseGestures');
    await config.update('gestureCommands', [
      { gesture: 'U', actions: [{ command: 'test.command.langone' }], when: "editorLangId == 'testlangone'", button: 'left' },
      { gesture: 'U', actions: [{ command: 'test.command.global' }], button: 'left' }
    ], vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache();

    testTextEditor = await vscode.workspace.openTextDocument(dummyFileUri);
    await vscode.languages.setTextDocumentLanguage(testTextEditor, 'testlangone');
    await vscode.window.showTextDocument(testTextEditor);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for context to update

    await viewProvider._handleGesture({ sequence: 'U', button: 0, inputType: 'mouse' });
    
    assert(executeCommandSpy.calledWith('test.command.langone'), 'test.command.langone should be called');
    assert(!executeCommandSpy.calledWith('test.command.global'), 'test.command.global should NOT be called');
  });

  test('Test Case 2: editorLangId mismatch (fallback to global)', async () => {
    const config = vscode.workspace.getConfiguration('mouseGestures');
    await config.update('gestureCommands', [
      { gesture: 'U', actions: [{ command: 'test.command.langone' }], when: "editorLangId == 'testlangone'", button: 'left' },
      { gesture: 'U', actions: [{ command: 'test.command.global' }], button: 'left' }
    ], vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache();

    testTextEditor = await vscode.workspace.openTextDocument(dummyFileUri);
    await vscode.languages.setTextDocumentLanguage(testTextEditor, 'otherlang');
    await vscode.window.showTextDocument(testTextEditor);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for context to update

    await viewProvider._handleGesture({ sequence: 'U', button: 0, inputType: 'mouse' });

    assert(executeCommandSpy.calledWith('test.command.global'), 'test.command.global should be called');
    assert(!executeCommandSpy.calledWith('test.command.langone'), 'test.command.langone should NOT be called');
  });

  test('Test Case 3: terminalFocus specific gesture', async () => {
    const config = vscode.workspace.getConfiguration('mouseGestures');
    await config.update('gestureCommands', [
      { gesture: 'D', actions: [{ command: 'test.command.terminal' }], when: "terminalFocus", button: 'left' },
      { gesture: 'D', actions: [{ command: 'test.command.globalfortd' }], button: 'left' }
    ], vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache();

    testTerminal = vscode.window.createTerminal("TestTerminal");
    testTerminal.show(true); // true to take focus
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for terminal to focus

    await viewProvider._handleGesture({ sequence: 'D', button: 0, inputType: 'mouse' });

    assert(executeCommandSpy.calledWith('test.command.terminal'), 'test.command.terminal should be called');
    assert(!executeCommandSpy.calledWith('test.command.globalfortd'), 'test.command.globalfortd should NOT be called');
  });

  test('Test Case 4: terminalFocus false (editor focused, fallback to global)', async () => {
    const config = vscode.workspace.getConfiguration('mouseGestures');
    await config.update('gestureCommands', [
      { gesture: 'D', actions: [{ command: 'test.command.terminal' }], when: "terminalFocus", button: 'left' },
      { gesture: 'D', actions: [{ command: 'test.command.globalfortd' }], button: 'left' }
    ], vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache();

    testTextEditor = await vscode.workspace.openTextDocument(dummyFileUri);
    await vscode.window.showTextDocument(testTextEditor, { preview: false, preserveFocus: true });
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for editor to focus

    await viewProvider._handleGesture({ sequence: 'D', button: 0, inputType: 'mouse' });

    assert(executeCommandSpy.calledWith('test.command.globalfortd'), 'test.command.globalfortd should be called');
    assert(!executeCommandSpy.calledWith('test.command.terminal'), 'test.command.terminal should NOT be called');
  });

  test('Test Case 5: Boolean context inDebugMode', async () => {
    const config = vscode.workspace.getConfiguration('mouseGestures');
    await config.update('gestureCommands', [
      { gesture: 'LR', actions: [{ command: 'test.command.debug' }], when: "inDebugMode", button: 'left' },
      { gesture: 'LR', actions: [{ command: 'test.command.nodebug' }], button: 'left' }
    ], vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache();

    // Start dummy debug session
    // Need a minimal launch configuration for "Debug" type
    // However, mocking activeDebugSession might be simpler if startDebugging is problematic in tests
    // For now, let's assume startDebugging works or can be made to work with a simple config
    const debugConfig = {
        type: "node", // Using node type as it's generally available
        request: "launch",
        name: "Test Debug Session",
        // A simple, non-invasive program to "debug"
        program: path.join(__dirname, "test_debug_target.js") // A dummy js file
    };
    // Create the dummy js file for the debugger to "launch"
    const dummyDebugTargetDir = path.join(__dirname, "debug_target_temp");
    if (!await fs.stat(dummyDebugTargetDir).then(() => true).catch(() => false)) {
        await fs.mkdir(dummyDebugTargetDir);
    }
    const dummyDebugTargetPath = path.join(dummyDebugTargetDir, "test_debug_target.js");
    await fs.writeFile(dummyDebugTargetPath, "console.log('Debug target started'); setTimeout(() => console.log('Debug target running'), 200);");

    const launchJsonPath = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.vscode', 'launch.json');
    // Ensure .vscode directory exists
    await fs.mkdir(path.dirname(launchJsonPath), { recursive: true }).catch(err => { if(err.code !== 'EEXIST') throw err; });
    await fs.writeFile(launchJsonPath, JSON.stringify({ version: "0.2.0", configurations: [debugConfig] }));
    
    await new Promise(resolve => {
        vscode.debug.onDidStartDebugSession(() => resolve());
        vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], "Test Debug Session").then(() => {}, (err) => {
            console.error("Failed to start debug session:", err);
            resolve(); // Resolve to not hang the test on error
        });
    });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for debug state to be fully set

    await viewProvider._handleGesture({ sequence: 'LR', button: 0, inputType: 'mouse' });
    assert(executeCommandSpy.calledWith('test.command.debug'), 'test.command.debug should be called after starting debug');
    assert(!executeCommandSpy.calledWith('test.command.nodebug'), 'test.command.nodebug should NOT be called after starting debug');
    executeCommandSpy.resetHistory();

    // Stop debug session
    await vscode.debug.stopDebugging();
    await new Promise(resolve => {
        const disposable = vscode.debug.onDidTerminateDebugSession(() => {
            disposable.dispose();
            resolve();
        });
         if (!vscode.debug.activeDebugSession) { // If already stopped
            disposable.dispose();
            resolve();
        }
    });
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for debug state to be fully unset

    await viewProvider._handleGesture({ sequence: 'LR', button: 0, inputType: 'mouse' });
    assert(executeCommandSpy.calledWith('test.command.nodebug'), 'test.command.nodebug should be called after stopping debug');
    assert(!executeCommandSpy.calledWith('test.command.debug'), 'test.command.debug should NOT be called after stopping debug');

    // Clean up dummy debug target and launch.json
    await fs.unlink(dummyDebugTargetPath).catch(e => console.error("Failed to delete dummy debug target:", e));
    await fs.rmdir(dummyDebugTargetDir).catch(e => console.error("Failed to delete dummy debug target dir:", e));
    await fs.unlink(launchJsonPath).catch(e => console.error("Failed to delete launch.json:", e));
  });

  test('Test Case 6: Operator &&', async () => {
    const config = vscode.workspace.getConfiguration('mouseGestures');
    await config.update('gestureCommands', [
      { gesture: 'DU', actions: [{ command: 'test.command.andcondition' }], when: "editorLangId == 'testlangtwo' && editorFocus", button: 'left' }
    ], vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache();

    testTextEditor = await vscode.workspace.openTextDocument(dummyFileUri);
    await vscode.languages.setTextDocumentLanguage(testTextEditor, 'testlangtwo');
    await vscode.window.showTextDocument(testTextEditor, { preview: false, preserveFocus: true }); // ensure focus
    await new Promise(resolve => setTimeout(resolve, 500));

    await viewProvider._handleGesture({ sequence: 'DU', button: 0, inputType: 'mouse' });
    assert(executeCommandSpy.calledWith('test.command.andcondition'), 'test.command.andcondition should be called');
  });

  test('Test Case 7: Operator ||', async () => {
    const config = vscode.workspace.getConfiguration('mouseGestures');
    await config.update('gestureCommands', [
      { gesture: 'UD', actions: [{ command: 'test.command.orcondition' }], when: "editorLangId == 'testlangthree' || terminalFocus", button: 'left' }
    ], vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache();

    // Condition 1: editorLangId is 'testlangthree'
    testTextEditor = await vscode.workspace.openTextDocument(dummyFileUri);
    await vscode.languages.setTextDocumentLanguage(testTextEditor, 'testlangthree');
    await vscode.window.showTextDocument(testTextEditor, { preview: false, preserveFocus: true });
    await new Promise(resolve => setTimeout(resolve, 500));

    await viewProvider._handleGesture({ sequence: 'UD', button: 0, inputType: 'mouse' });
    assert(executeCommandSpy.calledWith('test.command.orcondition'), 'OR Condition 1: test.command.orcondition should be called for editorLangId');
    executeCommandSpy.resetHistory();
    await vscode.commands.executeCommand('workbench.action.closeActiveEditor'); // Close editor

    // Condition 2: terminalFocus is true
    testTerminal = vscode.window.createTerminal("TestTerminalForOR");
    testTerminal.show(true); // Focus terminal
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for terminal focus

    await viewProvider._handleGesture({ sequence: 'UD', button: 0, inputType: 'mouse' });
    assert(executeCommandSpy.calledWith('test.command.orcondition'), 'OR Condition 2: test.command.orcondition should be called for terminalFocus');
  });

  test('Test Case 8: Operator != and !', async () => {
    const config = vscode.workspace.getConfiguration('mouseGestures');
    await config.update('gestureCommands', [
      { gesture: 'RL', actions: [{ command: 'test.command.notconditions' }], when: "editorLangId != 'testlangfour' && !inDebugMode", button: 'left' }
    ], vscode.ConfigurationTarget.Global);
    viewProvider._updateConfigCache();

    // Ensure not in debug mode (should be by default after previous tests)
    assert(!vscode.debug.activeDebugSession, "Should not be in debug mode at start of test 8");

    testTextEditor = await vscode.workspace.openTextDocument(dummyFileUri);
    await vscode.languages.setTextDocumentLanguage(testTextEditor, 'otherlang'); // Different from 'testlangfour'
    await vscode.window.showTextDocument(testTextEditor, { preview: false, preserveFocus: true });
    await new Promise(resolve => setTimeout(resolve, 500));

    await viewProvider._handleGesture({ sequence: 'RL', button: 0, inputType: 'mouse' });
    assert(executeCommandSpy.calledWith('test.command.notconditions'), 'test.command.notconditions should be called');
  });
});
