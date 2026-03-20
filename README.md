![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/pungggi/mouse_gestures?utm_source=oss&utm_medium=github&utm_campaign=pungggi%2Fmouse_gestures&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

# Mouse Gestures for VS Code

The first extension with enhanced mouse gesture support for Visual Studio Code. Execute commands by performing mouse gestures in the gesture pad.

Any [feedback](https://ngsoftware.canny.io/requests) is welcome.
Found an Issue? Please [create an issue](https://github.com/pungggi/mouse_gestures/issues/new/choose).

## Security

This extension has _no runtime dependencies_. The only dependency is on the VS Code API, which is provided by the host environment. Check out the [source code](https://github.com/pungggi/mouse_gestures) for more details.

## Features

- Execute VS Code commands using mouse gestures
- Configure custom gesture-to-command mappings
- **Context-aware gestures**: Same gesture can trigger different commands based on current context (editor focus, file type, etc.)
- Support for sequential and parallel command execution
- Support for mouse button click or mouse wheel action
- View all configured gestures with the "Mouse Gestures: Show Cheat Sheet" command
- Assign commands to unrecognized gestures with a simple prompt here is an example:
  ![Gesture Pad Interface](https://i.imgur.com/w8IptDb.gif)

  The example above adds the following to the settings.json:

  ```jsonc
  {
    "gesture": "DURDRU",
    "actions": [
      {
        "command": "git.commitStaged",
        "description": "Commit staged files"
      },
      {
        "command": "git.closeAllDiffEditors",
        "description": ""
      }
    ],
    "executionMode": "parallel"
  }
  ```

## How It Works

The extension provides two ways to perform mouse gestures:

### Gesture Pad View

The extension provides a gesture pad view in the activity bar where you can perform mouse gestures. When a gesture is detected, it executes the corresponding command(s) based on your configuration.

1. Click and hold the right, middle or left mouse button in the gesture pad
2. Move the mouse to draw your gesture (e.g., move right for "R" gesture, down-right for "DR" gesture)
3. Release the mouse button to execute the configured command(s)

4. Alternatively you can just do one mouse wheel (up, down, left or right)

### QuickPad Overlay

QuickPad provides an ephemeral overlay that appears directly in your active editor, allowing you to perform gestures anywhere without switching to the sidebar.

1. Press **Alt+G** (or use the "Mouse Gestures: Start QuickPad" command) to open the overlay
2. Draw your gesture in the overlay using mouse or wheel
3. The overlay automatically closes after gesture completion (configurable) or after 6 seconds of inactivity
4. Press **Escape** to cancel the overlay at any time

**Context-Aware**: QuickPad captures the current context (editor, terminal, file type) when invoked, allowing the same gesture to trigger different commands based on where you're working.

### Default Gesture Mappings

- `R` (Right): Switch to next editor
- `L` (Left): Switch to previous editor

You can override these defaults or add new gestures by configuring `mouseGestures.gestureCommands` in your settings. The extension supports both cardinal directions (R, L, U, D) and diagonal directions (UR, UL, DR, DL).

### Viewing Configured Gestures

Use the "Mouse Gestures: Show Cheat Sheet" command from the command palette (Ctrl+Shift+P) to view all configured gestures in a visually organized cheat sheet. The cheat sheet now groups gestures by their associated command descriptions, making it easier to find and understand your configured gestures. The cheat sheet displays:

- Gesture patterns with visual representations
- Associated commands or descriptions
- Clear distinction between parallel (→) and sequential (1. 2. 3. ) command execution

![Gesture Cheat Sheet](https://i.imgur.com/nVsr0Lf.png)

### Context-Aware Gestures

The extension supports context-aware gestures using VS Code's "when clause" expressions. This allows the same gesture to trigger different commands based on the current context, such as:

- Which editor is focused
- What file type is open
- Which view is visible
- Current editor state (has selection, read-only, etc.)

#### Examples of Context-Aware Gestures

```jsonc
{
  // Same gesture "U" behaves differently based on context
  "gesture": "U",
  "when": "editorTextFocus",
  "actions": [{
    "command": "editor.action.moveLinesUpAction",
    "description": "Move line up when in editor"
  }]
},
{
  "gesture": "U",
  "when": "explorerViewletVisible && explorerViewletFocus",
  "actions": [{
    "command": "list.collapseAll",
    "description": "Collapse all in explorer when explorer is focused"
  }]
},
{
  // Language-specific gesture
  "gesture": "DR",
  "when": "editorLangId == typescript || editorLangId == javascript",
  "actions": [{
    "command": "editor.action.goToDeclaration",
    "description": "Go to declaration in TypeScript/JavaScript files"
  }]
}
```

#### Available Context Keys

The extension implements the following context keys for use in `when` expressions:

**Editor Contexts:**

- `editorFocus` - Editor has focus
- `editorTextFocus` - Text editor has focus (not terminal)
- `editorHasSelection` - Text is selected
- `editorHasMultipleSelections` - Multiple selections exist
- `editorReadonly` - Editor is read-only
- `editorLangId` - Language ID (e.g., `editorLangId == 'typescript'`)
- `editorIsDirty` / `activeEditorIsDirty` - Editor has unsaved changes
- `editorLineNumber` - Current cursor line number (1-based)
- `isInDiffEditor` - Active editor is a diff editor

**File/Resource Contexts:**

- `resourceScheme` - URI scheme (e.g., 'file')
- `resourceFilename` - File name
- `resourceExtname` - File extension
- `resourceDirname` - Directory path of the resource
- `resourcePath` - Full resource path
- `resourceLangId` - Language ID from resource
- `isFileSystemResource` - Is a file system resource

**Debug Contexts:**

- `inDebugMode` - A debug session is active
- `debugType` - Type of the active debug session (e.g., 'node', 'python')
- `debugState` - Debug state: 'inactive' or 'running'
- `debuggersAvailable` - At least one debugger extension is installed

**System Contexts:**

- `isLinux`, `isMac`, `isWindows` - Operating system detection
- `isWeb` - Running in web environment

**Workspace Contexts:**

- `workspaceFolderCount` - Number of workspace folders
- `workbenchState` - 'empty', 'folder', or 'workspace'

**Terminal Contexts:**

- `terminalFocus` - Terminal has focus
- `terminalIsOpen` - Terminal is open
- `terminalCount` - Number of open terminals

**Editor Group Contexts:**

- `editorIsOpen` - Any editor is open
- `multipleEditorGroups` - Multiple editor groups exist
- `groupEditorsCount` - Number of tabs in the active editor group
- `activeEditorGroupIndex` - Index of the active editor group
- `activeEditorGroupLast` - Active group is the last group
- `activeEditorGroupEmpty` - Active group has no editors

**Window Contexts:**

- `windowFocused` - VS Code window has focus

**Configuration:**

- `config.*` - Access any VS Code configuration (e.g., `config.editor.minimap.enabled`)

**Logical Operators:**

- `&&` (and), `||` (or), `!` (not)
- `==`, `!=`, `>`, `<`, `>=`, `<=`
- `=~` (regex matching)
- `in`, `not in` (array/object membership)
- Parentheses for grouping: `(condition1 || condition2) && condition3`

## Configuration

Some examples:

```jsonc
"mouseGestures.gestureCommands": [
  {
    // Simple gesture that executes a single command
    "gesture": "R",
    "actions": [
      {
        "command": "workbench.action.nextEditor",
        "description": "Switch to next editor"
      }
    ]
  },
  {
    // Context-aware gesture - same gesture, different behavior
    "gesture": "U",
    "when": "editorTextFocus",
    "actions": [
      {
        "command": "editor.action.moveLinesUpAction",
        "description": "Move line up when in editor"
      }
    ]
  },
  {
    "gesture": "U",
    "when": "explorerViewletFocus",
    "actions": [
      {
        "command": "list.collapseAll",
        "description": "Collapse all when explorer focused"
      }
    ]
  },
  {
      "gesture": "U",
      "inputType": "wheel",
      "actions": [
          {
              "command": "workbench.action.previousEditor",
              "description": "prev"
          }
      ]
  },
  {
    // Complex gesture with multiple sequential commands
    "gesture": "DR",
    "executionMode": "sequential",
    "actions": [
      {
        "command": "workbench.action.files.save",
        "description": "Save current file"
      },
      {
        "command": "workbench.action.closeActiveEditor",
        "description": "Close current editor"
      }
    ]
  },
  {
    // Gesture with parallel command execution
    "gesture": "UL",
    "executionMode": "parallel",
    "actions": [
      {
        "command": "workbench.action.files.save",
        "description": "Save all files"
      },
      {
        "command": "workbench.action.files.saveAll",
        "description": "Save all files"
      }
    ]
  },
  {
    // Using args
    "gesture": "U",
    "executionMode": "sequential",
    "actions": [
        {
            "command": "workbench.action.terminal.newWithCwd",
            "description": ""
        },
        {
            "command": "workbench.action.terminal.sendSequence",
            "description": "Open app.json",
            "args": [
                {
                    "text": "code app.json\r"
                }
            ],
            "waitSeconds": 1
        },
        {
            "command": "workbench.action.terminal.kill",
            "description": ""
        }
    ]
  }
]
```

### Configuration Options

- `gesture`: The gesture string to match. Possible values:

  - Single directions: "R" (right), "L" (left), "U" (up), "D" (down)
  - Diagonal combinations: "UR" (up-right), "UL" (up-left), "DR" (down-right), "DL" (down-left)
  - Multi-direction sequences: e.g. "LRUD", "DR", "ULD"

- `inputType`: Specifies the input method this gesture applies to (optional)

  - `"mouse"`: Applies only to mouse drag gestures.
  - `"wheel"`: Applies only to mouse wheel actions.

- `executionMode`: How to execute multiple commands (optional)

  - `"sequential"`: Execute commands one after another (default)
  - `"parallel"`: Execute all commands simultaneously

- `button`: Specifies the mouse button this gesture applies to (optional)

  - `"left"`: Applies only to left mouse button gestures.
  - `"middle"`: Applies only to middle mouse button gestures.
  - `"right"`: Applies only to right mouse button gestures.
  - If not set, the gesture matches any mouse button. This means the same gesture pattern with different buttons triggers the same command. To differentiate commands by button, set the `button` property explicitly on each entry.

- `actions`: Array of command objects, each containing:
  - `command`: The VS Code command ID to execute (required)
  - `description`: Optional description of what the command does
  - `waitSeconds`: Number of seconds to wait before executing the next command (only applies in sequential mode, must be a positive integer)
  - `args`: Optional array of arguments to pass to the command
- `group`: Optional string. Assigns the gesture to a specific group in the cheat sheet for better organization. Gestures without a group will appear under a default "Ungrouped" category.

## Troubleshooting

A test webpage is available locally in the `dist` folder (./dist/test_gesture_recognition.html).

1. **Inconsistent Recognition**

   - **Issue**: A gesture works sometimes but not always
   - **Solution**:
     - Make your gestures more distinct with clearer direction changes
     - Draw gestures with deliberate, clear movements

2. **Wrong Command Executing**

   - **Issue**: A different command executes than the one you expected
   - **Solution**:
     - Check for conflicting gestures that might match the same input
     - Review the order of your gesture configurations

3. **Button Configuration**

   - **Issue**: The same gesture triggers the same command regardless of which mouse button is used.
   - **Solution**:
     - To differentiate commands by mouse button, add the `button` property (`"left"`, `"middle"`, or `"right"`) to each gesture entry in your `settings.json`.
     - If `button` is not specified, the gesture matches any mouse button.
     - To have different commands for the same gesture with different buttons, create separate entries with the same gesture but different `button` values.
