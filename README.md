# Mouse Gestures for VS Code

Mouse gesture support for Visual Studio Code. Execute commands by performing mouse gestures in the gesture pad.

## Features

- Execute VS Code commands using mouse gestures
- Configure custom gesture-to-command mappings
- Support for sequential and parallel command execution
- Support for waiting on command completion
- Built-in gesture pad for gesture detection

## How It Works

The extension provides a gesture pad view in the activity bar where you can perform mouse gestures. When a gesture is detected, it executes the corresponding command(s) based on your configuration.

1. Click and hold the right mouse button in the gesture pad
2. Move the mouse to draw your gesture (e.g., move right for "R" gesture)
3. Release the mouse button to execute the configured command(s)

## Usage

1. Open the gesture pad view from the activity bar (mouse icon)
2. Configure your desired gesture-to-command mappings in settings
3. Perform gestures to execute commands

## Configuration

This extension contributes the following settings:

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
    // Complex gesture with multiple sequential commands
    "gesture": "DR",
    "executionMode": "sequential",
    "actions": [
      {
        "command": "workbench.action.files.save",
        "description": "Save current file",
        "waitForCompletion": true
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
  }
]
```

### Configuration Options

- `gesture`: The gesture string to match. Possible values:

  - Single directions: "R" (right), "L" (left), "U" (up), "D" (down)
  - Diagonal combinations: "UR" (up-right), "UL" (up-left), "DR" (down-right), "DL" (down-left)

- `executionMode`: How to execute multiple commands (optional)

  - `"sequential"`: Execute commands one after another (default)
  - `"parallel"`: Execute all commands simultaneously

- `actions`: Array of command objects, each containing:
  - `command`: The VS Code command ID to execute (required)
  - `description`: Optional description of what the command does
  - `waitForCompletion`: Whether to wait for the command to complete before executing the next one (only applies in sequential mode)
  - `args`: Optional array of arguments to pass to the command

### Default Gesture Mappings

- `R` (Right): Switch to next editor
- `L` (Left): Switch to previous editor

You can override these defaults or add new gestures by configuring `mouseGestures.gestureCommands` in your settings.
