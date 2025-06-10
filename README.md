# Mouse Gestures for VS Code

The first extension with enhanced mouse gesture support for Visual Studio Code. Execute commands by performing mouse gestures in the gesture pad.

Any [feedback](https://ngsoftware.canny.io/requests) is welcome.

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

The extension provides a gesture pad view in the activity bar where you can perform mouse gestures. When a gesture is detected, it executes the corresponding command(s) based on your configuration.

1. Click and hold the right, middle or left mouse button in the gesture pad
2. Move the mouse to draw your gesture (e.g., move right for "R" gesture, down-right for "DR" gesture)
3. Release the mouse button to execute the configured command(s)

4. Alternatively you can just do one mouse wheel (up, down, left or right)

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

You can use any of VS Code's built-in context keys in your `when` expressions:

- **Editor contexts**: `editorTextFocus`, `editorLangId`, `editorHasSelection`, `editorReadonly`
- **File contexts**: `resourceFilename`, `resourceExtname`, `resourceScheme`
- **View contexts**: `explorerViewletVisible`, `sideBarFocus`, `panelFocus`
- **Language contexts**: `editorLangId == 'typescript'`, `editorLangId == 'python'`
- **Configuration**: `config.editor.minimap.enabled`
- **Logical operators**: `&&` (and), `||` (or), `!` (not)

For a complete list of available context keys, see the [VS Code documentation](https://code.visualstudio.com/api/references/when-clause-contexts).

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
    // Complex pattern using regex
    "gesture": "^LRUDLR$",
    "matchType": "pattern",
    "actions": [
      {
        "command": "workbench.action.toggleSidebarVisibility",
        "description": "Toggle sidebar visibility"
      }
    ]
  },
  {
    // Using args
    "gesture": "U",
    "matchType": "exact",
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
  - Complex patterns: Regular expressions for matching complex gesture sequences (requires `matchType: "pattern"`)

- `matchType`: The type of matching to use for the gesture (optional)

  - `"exact"`: Match the exact gesture string (default)
  - `"pattern"`: Use regular expression pattern matching for complex gestures

- `inputType`: Specifies the input method this gesture applies to (optional)

  - `"mouse"`: Applies only to mouse drag gestures.
  - `"wheel"`: Applies only to mouse wheel actions.

- `executionMode`: How to execute multiple commands (optional)

  - `"sequential"`: Execute commands one after another (default)
  - `"parallel"`: Execute all commands simultaneously

- `button`: Specifies the mouse button this gesture applies to (mandatory for inputType=mouse)

  - `"left"`: Applies to left mouse button gestures (default).
  - `"middle"`: Applies to middle mouse button gestures.
  - `"right"`: Applies to right mouse button gestures.

- `actions`: Array of command objects, each containing:
  - `command`: The VS Code command ID to execute (required)
  - `description`: Optional description of what the command does
  - `waitSeconds`: Number of seconds to wait before executing the next command (only applies in sequential mode, must be a positive integer)
  - `args`: Optional array of arguments to pass to the command
- `group`: Optional string. Assigns the gesture to a specific group in the cheat sheet for better organization. Gestures without a group will appear under a default "Ungrouped" category.

This should allow you to work with the extension, but if you want to go deeper then read further:

## Complex Gesture Patterns

The extension supports complex gesture patterns through regular expression matching, allowing for more expressive and powerful gesture definitions beyond simple directional gestures.

### Overview

Complex gesture patterns enable you to:

- Define gestures that match specific sequences of directions
- Create patterns with repetitions, alternatives, and other regex features
- Design custom, memorable gestures for frequently used commands
- Implement application-specific gesture workflows

### How to Define Complex Patterns

To define a complex gesture pattern:

1. Set the `gesture` property to a regular expression pattern
2. Set the `matchType` property to `"pattern"`
3. Ensure the `mouseGestures.enablePatternMatching` setting is enabled (true by default)

Example configuration:

```jsonc
{
  "gesture": "^L(RU)+D$",
  "matchType": "pattern",
  "actions": [
    {
      "command": "workbench.action.files.saveAll",
      "description": "Save all files"
    }
  ]
}
```

### Examples

Here are some examples of complex gesture patterns:

1. **Exact Sequence**: `^LRUDLR$`

   - Matches the exact sequence Left, Right, Up, Down, Left, Right
   - Useful for specific, memorable patterns

2. **Repeated Pattern**: `^L(RU)+D$`

   - Matches Left, followed by one or more Right-Up combinations, ending with Down
   - Example matches: LRUD, LRURUD, LRURURUD

3. **Alternative Directions**: `^L(R|U)D$`

   - Matches Left, followed by either Right or Up, ending with Down
   - Example matches: LRD, LUD

4. **Optional Directions**: `^LR?UD$`

   - Matches Left, optionally followed by Right, then Up and Down
   - Example matches: LUD, LRUD

5. **Counting Repetitions**: `^L(RU){2,3}D$`

   - Matches Left, followed by 2-3 repetitions of Right-Up, ending with Down
   - Example matches: LRURUD, LRURURUD

6. **Z-shaped Gesture**: `^RDLR$`
   - Creates a Z-shaped pattern: Right, then Down-Left (diagonal), then Right
   - Visually intuitive for actions like "clear all" or "reset view"

### Best Practices

For creating reliable and memorable complex gesture patterns:

1. **Keep patterns simple**

   - Shorter patterns are easier to remember and execute
   - Limit the use of complex regex features for better usability

2. **Use anchors**

   - Start patterns with `^` and end with `$` to match the entire gesture
   - This prevents unintended partial matches

3. **Create meaningful patterns**

   - Design patterns that visually represent the action they perform
   - For example, a Z-shaped gesture (RULD) for "clear all"

4. **Test thoroughly**

   - Verify your patterns work as expected before relying on them
   - Consider the physical ergonomics of executing the gesture

5. **Avoid conflicts**

   - Ensure complex patterns don't conflict with simpler gestures

### Technical Details

The extension implements [Douglas-Peucker path simplification algorithm](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm) and regex pattern matching with the following approach:

- Raw mouse movements are captured as coordinate points
- The Douglas-Peucker algorithm simplifies the path by removing redundant points
- The simplified path is converted to a sequence of directional movements (R, L, U, D, UR, UL, DR, DL)
- For pattern-based gestures, this sequence is matched against configured regex patterns

1. When a gesture is performed, the system captures the sequence of directions (e.g., "LRUDLR")
2. If pattern matching is enabled, the system checks each pattern-type gesture configuration
3. The gesture string is tested against each regex pattern using JavaScript's `RegExp.test()`
4. The first matching pattern's commands are executed

### Troubleshooting

A test webpage is available locally in the `dist` folder (./dist/test_gesture_recognition.html).

Common issues with complex gesture patterns, button configurations, and how to resolve them:

1. **Pattern Not Matching**

   - **Issue**: Your complex pattern isn't being recognized
   - **Solution**:
     - Verify `mouseGestures.enablePatternMatching` is set to true
     - Check that `matchType` is set to `"pattern"`
     - Test your regex pattern in a regex tester
     - Simplify the pattern and gradually add complexity

2. **Inconsistent Recognition**

   - **Issue**: The pattern works sometimes but not always
   - **Solution**:
     - Make your gestures more distinct with clearer direction changes
     - Draw gestures with deliberate, clear movements
     - Consider using simpler patterns with fewer direction changes

3. **Wrong Command Executing**

   - **Issue**: A different command executes than the one you expected
   - **Solution**:
     - Check for conflicting patterns that might match the same gesture
     - Use anchors (`^` and `$`) to ensure exact matching
     - Review the order of your gesture configurations

4. **Button Configuration Requirement**

   - **Issue**: The `button` field is now mandatory in gesture configurations.
   - **Solution**:
     - Open your `settings.json` file in VS Code.
     - Navigate to the `mouseGestures.gestureCommands` section.
     - Ensure each gesture entry has a `button` field specified as `"left"`, `"middle"`, or `"right"`.
     - If not specified, it defaults to `"left"`.
     - Save the file to ensure compatibility with the updated extension.

5. **Performance Issues**

   - **Issue**: Noticeable lag when using complex patterns
   - **Solution**:
     - Reduce the number of complex patterns
     - Simplify regex patterns by avoiding excessive use of lookaheads/lookbehinds
     - Make gestures more deliberate and distinct

6. **Regex Syntax Errors**
   - **Issue**: Pattern not working due to invalid regex syntax
   - **Solution**:
     - Check the browser console for error messages
     - Validate your regex using an online regex tester
     - Review JavaScript RegExp syntax documentation
