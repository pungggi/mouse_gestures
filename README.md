# Mouse Gestures for VS Code

Mouse gesture support for Visual Studio Code. Execute commands by performing mouse gestures in the gesture pad.

## Features

- Execute VS Code commands using mouse gestures
- Configure custom gesture-to-command mappings
- Support for sequential and parallel command execution
- Support for waiting on command completion
- Built-in gesture pad for gesture detection
- Support for complex gesture patterns using regular expressions
- Full 8-direction support including diagonal movements (UR, UL, DR, DL)
- Assign commands to unrecognized gestures with a simple prompt
  ![Gesture Pad Interface](https://i.imgur.com/w8IptDb.gif)

  Adds the following to the setting:

  ```jsonc
  {
    "gesture": "DURDRU",
    "matchType": "exact",
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
    "match": {
      "executionMode": "parallel"
    }
  }
  ```

## How It Works

The extension provides a gesture pad view in the activity bar where you can perform mouse gestures. When a gesture is detected, it executes the corresponding command(s) based on your configuration.

1. Click and hold the right or left mouse button in the gesture pad
2. Move the mouse to draw your gesture (e.g., move right for "R" gesture, down-right for "DR" gesture)
3. Release the mouse button to execute the configured command(s)

### Default Gesture Mappings

- `R` (Right): Switch to next editor
- `L` (Left): Switch to previous editor

You can override these defaults or add new gestures by configuring `mouseGestures.gestureCommands` in your settings. The extension supports both cardinal directions (R, L, U, D) and diagonal directions (UR, UL, DR, DL).

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
  - `"prefix"`: Match if the performed gesture starts with the specified pattern
  - `"pattern"`: Use regular expression pattern matching for complex gestures

- `executionMode`: How to execute multiple commands (optional)

  - `"sequential"`: Execute commands one after another (default)
  - `"parallel"`: Execute all commands simultaneously

- `actions`: Array of command objects, each containing:
  - `command`: The VS Code command ID to execute (required)
  - `description`: Optional description of what the command does
  - `waitForCompletion`: Whether to wait for the command to complete before executing the next one (only applies in sequential mode)
  - `args`: Optional array of arguments to pass to the command

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
   - Be careful with patterns that might match as prefixes of other patterns

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

Performance considerations:

- Complex regex patterns may impact performance if overused
- Patterns are compiled and cached for better performance
- The system uses a three-step matching process (exact, prefix, pattern) for efficiency

### Troubleshooting

Common issues with complex gesture patterns and how to resolve them:

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

4. **Performance Issues**

   - **Issue**: Noticeable lag when using complex patterns
   - **Solution**:
     - Reduce the number of complex patterns
     - Simplify regex patterns by avoiding excessive use of lookaheads/lookbehinds
     - Make gestures more deliberate and distinct

5. **Regex Syntax Errors**
   - **Issue**: Pattern not working due to invalid regex syntax
   - **Solution**:
     - Check the browser console for error messages
     - Validate your regex using an online regex tester
     - Review JavaScript RegExp syntax documentation
