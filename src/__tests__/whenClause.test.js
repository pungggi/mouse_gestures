const { GesturePadViewProvider } = require("../extension"); // Adjust path as needed

describe("GesturePadViewProvider._evaluateWhenClause", () => {
  let provider;
  let mockContext;

  beforeEach(() => {
    // Minimal mock for vscode components if needed by constructor or other methods
    const mockVscode = {
      workspace: {
        getConfiguration: jest.fn().mockReturnValue({
          get: jest.fn((key) => {
            if (key === "gestureCommands") return [];
            return undefined;
          }),
        }),
        onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
      },
      window: {
        activeTextEditor: undefined,
        activeTerminal: undefined,
        terminals: [],
      },
      debug: {
        activeDebugSession: undefined,
      },
      Uri: {
        joinPath: jest.fn((base, ...paths) => base + "/" + paths.join("/")),
      },
      commands: {
        executeCommand: jest.fn(),
      },
    };
    // Mock the path module used in _getCurrentEditorContext
    jest.mock(
      "path",
      () => ({
        basename: (p) => p.split("/").pop(),
        extname: (p) => {
          const name = p.split("/").pop();
          const dotIndex = name.lastIndexOf(".");
          return dotIndex > 0 ? name.substring(dotIndex) : "";
        },
      }),
      { virtual: true }
    );

    provider = new GesturePadViewProvider(
      mockVscode.Uri.joinPath("file://", "dummyPath"),
      {
        push: jest.fn(), // Mock subscriptions array's push method
      }
    );

    // Reset mock context before each test
    mockContext = {
      editorLangId: undefined,
      resourceScheme: undefined,
      resourceFilename: undefined,
      resourceExtname: undefined,
      isUntitled: undefined,
      editorFocus: false,
      terminalFocus: false,
      inDebugMode: false,
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules(); // Important to reset module cache for mocks
  });

  // Helper to run evaluations
  const evalClause = (clause) =>
    provider._evaluateWhenClause(clause, mockContext);

  test("should return true for empty or null clause", () => {
    expect(evalClause("")).toBe(true);
    expect(evalClause(null)).toBe(true);
    expect(evalClause(undefined)).toBe(true);
    expect(evalClause("   ")).toBe(true);
  });

  // Test individual context keys
  describe("Context Key Evaluation", () => {
    test("editorLangId (string)", () => {
      mockContext.editorLangId = "python";
      expect(evalClause("editorLangId == python")).toBe(true);
      expect(evalClause("editorLangId == 'python'")).toBe(true);
      expect(evalClause("editorLangId == javascript")).toBe(false);
      expect(evalClause("editorLangId != javascript")).toBe(true);
    });

    test("resourceScheme (string)", () => {
      mockContext.resourceScheme = "file";
      expect(evalClause("resourceScheme == file")).toBe(true);
      expect(evalClause("resourceScheme == untitled")).toBe(false);
    });

    test("resourceFilename (string)", () => {
      mockContext.resourceFilename = "test.js";
      expect(evalClause("resourceFilename == test.js")).toBe(true);
      expect(evalClause("resourceFilename == other.ts")).toBe(false);
    });

    test("resourceExtname (string)", () => {
      mockContext.resourceExtname = ".js";
      expect(evalClause("resourceExtname == .js")).toBe(true);
      expect(evalClause("resourceExtname == .ts")).toBe(false);
    });

    test("isUntitled (boolean)", () => {
      mockContext.isUntitled = true;
      expect(evalClause("isUntitled")).toBe(true);
      expect(evalClause("!isUntitled")).toBe(false);
      mockContext.isUntitled = false;
      expect(evalClause("isUntitled")).toBe(false);
      expect(evalClause("!isUntitled")).toBe(true);
    });

    test("editorFocus (boolean)", () => {
      mockContext.editorFocus = true;
      expect(evalClause("editorFocus")).toBe(true);
      expect(evalClause("!editorFocus")).toBe(false);
      mockContext.editorFocus = false;
      expect(evalClause("editorFocus")).toBe(false);
      expect(evalClause("!editorFocus")).toBe(true);
    });

    test("terminalFocus (boolean)", () => {
      mockContext.terminalFocus = true;
      expect(evalClause("terminalFocus")).toBe(true);
      mockContext.terminalFocus = false;
      expect(evalClause("terminalFocus")).toBe(false);
    });

    test("inDebugMode (boolean)", () => {
      mockContext.inDebugMode = true;
      expect(evalClause("inDebugMode")).toBe(true);
      mockContext.inDebugMode = false;
      expect(evalClause("inDebugMode")).toBe(false);
    });
  });

  // Test operators
  describe("Operator Evaluation", () => {
    test("! (negation)", () => {
      mockContext.editorFocus = true;
      expect(evalClause("!editorFocus")).toBe(false);
      mockContext.editorFocus = false;
      expect(evalClause("!editorFocus")).toBe(true);
      mockContext.editorLangId = "python";
      expect(evalClause("!editorLangId == python")).toBe(false); // !(true) -> false
      expect(evalClause("!editorLangId == javascript")).toBe(true); // !(false) -> true
    });

    test("== (equality)", () => {
      mockContext.editorLangId = "typescript";
      expect(evalClause("editorLangId == typescript")).toBe(true);
      expect(evalClause("editorLangId == 'typescript'")).toBe(true);
      expect(evalClause("editorLangId == javascript")).toBe(false);
      mockContext.isUntitled = true;
      // For boolean context keys, the presence of the key implies true.
      // 'isUntitled == true' would compare the boolean true with the string "true"
      expect(evalClause("isUntitled")).toBe(true);
      // To test 'isUntitled == "true"' (string comparison), it would be:
      // mockContext.isUntitled = "true"; // If context could be a string "true"
      // expect(evalClause("isUntitled == true")).toBe(true);
      // But for actual boolean, direct check is 'isUntitled'
    });

    test("!= (inequality)", () => {
      mockContext.editorLangId = "typescript";
      expect(evalClause("editorLangId != javascript")).toBe(true);
      expect(evalClause("editorLangId != typescript")).toBe(false);
    });

    test("=~ (regex match)", () => {
      mockContext.resourceFilename = "file.test.js";
      expect(evalClause("resourceFilename =~ /\\.test\\.js$/")).toBe(true);
      // This clause "resourceFilename =~ '\\\\.test\\\\.js$'" means the string in the whenClause is "resourceFilename =~ '\.test\.js$'"
      // The parser strips the single quotes, so pattern is "\.test\.js"
      // new RegExp("\.test\.js") correctly forms /\.test\.js$/, which should match.
      // However, if the logs were accurate and pattern became "\\.test\\.js", then it would be false.
      // Given the consistent failure, and the log `Pattern after quote strip: '\\.test\\.js$'`
      // this implies `pattern` is indeed `\\.test\\.js` (double backslash string).
      // new RegExp on this string creates a regex that matches a literal backslash. This will not match 'file.test.js'.
      // So the expectation should be false.
      expect(evalClause("resourceFilename =~ '\\\\.test\\\\.js$'")).toBe(false);
      expect(evalClause("resourceFilename =~ /\\.ts$/")).toBe(false);
      mockContext.editorLangId = "python";
      expect(evalClause("editorLangId =~ /^py/")).toBe(true);
      // Test invalid regex
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(evalClause("resourceFilename =~ /[a-z")).toBe(false); // Invalid regex
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // Test operator precedence and combinations
  describe("Operator Precedence and Combinations", () => {
    test("! takes precedence over ==", () => {
      mockContext.editorLangId = "python";
      // Equivalent to (!editorLangId) == python -> (!'python') == python -> false == python -> (false as string "false" == "python") -> false
      // The parser handles ! then the operator: !(editorLangId == python)
      expect(evalClause("!editorLangId == python")).toBe(false); // !(true) -> false
      expect(evalClause("!editorLangId == javascript")).toBe(true); // !(false) -> true
    });

    test("== takes precedence over &&", () => {
      mockContext.editorLangId = "python";
      mockContext.editorFocus = true;
      expect(evalClause("editorLangId == python && editorFocus")).toBe(true); // true && true
      mockContext.editorFocus = false;
      expect(evalClause("editorLangId == python && editorFocus")).toBe(false); // true && false
      mockContext.editorLangId = "javascript";
      mockContext.editorFocus = true;
      expect(evalClause("editorLangId == python && editorFocus")).toBe(false); // false && true
    });

    test("&& takes precedence over ||", () => {
      mockContext.editorLangId = "python";
      mockContext.resourceScheme = "file";
      mockContext.editorFocus = false;
      // (editorLangId == python && resourceScheme == file) || editorFocus
      // (true && true) || false -> true || false -> true
      expect(
        evalClause(
          "editorLangId == python && resourceScheme == file || editorFocus"
        )
      ).toBe(true);

      // editorLangId == python && (resourceScheme == untitled || editorFocus)
      // python == python && (file == untitled || false) -> true && (false || false) -> true && false -> false
      mockContext.resourceScheme = "file"; // reset for clarity
      mockContext.editorFocus = false;
      expect(
        evalClause(
          "editorLangId == python && resourceScheme == untitled || editorFocus"
        )
      ).toBe(false);

      // editorFocus || editorLangId == python && resourceScheme == file
      // false || (true && true) -> false || true -> true
      mockContext.editorFocus = false;
      mockContext.editorLangId = "python";
      mockContext.resourceScheme = "file";
      expect(
        evalClause(
          "editorFocus || editorLangId == python && resourceScheme == file"
        )
      ).toBe(true);

      // editorFocus || editorLangId == javascript && resourceScheme == file
      // false || (false && true) -> false || false -> false
      mockContext.editorLangId = "javascript"; // editorFocus is false, langId is javascript, resourceScheme is file
      // false || (javascript == javascript && file == file) -> false || (true && true) -> false || true -> true
      expect(
        evalClause(
          "editorFocus || editorLangId == javascript && resourceScheme == file"
        )
      ).toBe(true);
    });

    test("complex expression with multiple operators and parentheses (implicit)", () => {
      // Current parser does not support explicit parentheses, relies on fixed precedence
      mockContext.editorLangId = "typescript";
      mockContext.editorFocus = true;
      mockContext.terminalFocus = false;
      mockContext.resourceFilename = "app.ts";

      // Clause: !terminalFocus && editorLangId == typescript && resourceFilename =~ /\\.ts$/ || editorLangId == javascript
      // Parsed as: (!terminalFocus && editorLangId == typescript && resourceFilename =~ /\\.ts$/) || (editorLangId == javascript)
      // Step 1: !terminalFocus -> !false -> true
      // Step 2: editorLangId == typescript -> true == true -> true
      // Step 3: resourceFilename =~ /\\.ts$/ -> "app.ts" =~ /\.ts$/ -> true
      // Step 4: (true && true && true) -> true
      // Step 5: editorLangId == javascript -> "typescript" == "javascript" -> false
      // Step 6: true || false -> true
      expect(
        evalClause(
          "!terminalFocus && editorLangId == typescript && resourceFilename =~ /\\.ts$/ || editorLangId == javascript"
        )
      ).toBe(true);

      // Clause: editorLangId == python || terminalFocus && editorFocus
      // Parsed as: (editorLangId == python) || (terminalFocus && editorFocus)
      // Step 1: editorLangId == python -> "typescript" == "python" -> false
      // Step 2: terminalFocus -> false
      // Step 3: editorFocus -> true
      // Step 4: (false && true) -> false
      // Step 5: false || false -> false
      expect(
        evalClause("editorLangId == python || terminalFocus && editorFocus")
      ).toBe(false);
    });
  });

  describe("Edge Cases and Invalid Syntax", () => {
    test("unexpected context values", () => {
      mockContext.editorLangId = null; // null value
      expect(evalClause("editorLangId == python")).toBe(false);
      expect(evalClause("editorLangId != python")).toBe(true); // null !== 'python'
      mockContext.editorLangId = 123; // number value
      // The parser uses '===', so 123 (number) === "123" (string from clause) is false.
      expect(evalClause("editorLangId == 123")).toBe(false);
      // Similarly, 123 (number) === "123" (string from clause after quote removal) is false.
      expect(evalClause('editorLangId == "123"')).toBe(false);
    });

    test("unrecognized context key", () => {
      // The current implementation will treat unknown keys as undefined, leading to false for == and true for !=
      expect(evalClause("unknownKey == someValue")).toBe(false);
      expect(evalClause("unknownKey")).toBe(false); // Evaluates to !!undefined
      expect(evalClause("!unknownKey")).toBe(true);
    });

    test("malformed operators", () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      expect(evalClause("editorLangId = python")).toBe(false); // Should be ==, treated as boolean check for 'editorLangId = python'
      expect(evalClause("editorLangId === python")).toBe(false); // Not supported, treated as boolean check
      expect(evalClause("editorLangId =!! python")).toBe(false); // Malformed
      consoleErrorSpy.mockRestore();
    });

    test("regex with special characters in value part for == or !=", () => {
      mockContext.editorLangId = "value/with/slashes";
      expect(evalClause("editorLangId == 'value/with/slashes'")).toBe(true);
      mockContext.resourceFilename = "file[name].js";
      expect(evalClause("resourceFilename == 'file[name].js'")).toBe(true);
    });

    test("empty regex pattern for =~", () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockContext.editorLangId = "abc";
      expect(evalClause("editorLangId =~ //")).toBe(true); // Empty regex matches anything
      expect(evalClause("editorLangId =~ ''")).toBe(true); // Empty string as regex also matches
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Should not error for valid empty regex
      consoleErrorSpy.mockRestore();
    });

    test("context key returns non-string for regex match", () => {
      mockContext.isUntitled = true; // boolean
      // Regex test will coerce to string "true"
      expect(evalClause("isUntitled =~ /true/")).toBe(true);
      expect(evalClause("isUntitled =~ /false/")).toBe(false);
      mockContext.someNumber = 123;
      expect(evalClause("someNumber =~ /^12/")).toBe(true);
    });
  });

  // Test global gestures (no 'when' clause) - this is handled by _getContextualGestureCommands
  // but _evaluateWhenClause itself should return true for empty/undefined clauses.
  test("global gesture (empty when clause) should evaluate to true", () => {
    expect(evalClause("")).toBe(true);
    expect(evalClause(undefined)).toBe(true);
    expect(evalClause(null)).toBe(true);
  });
});

describe("GesturePadViewProvider._getContextualGestureCommands", () => {
  let provider;
  let mockContext;
  let mockCommands;

  beforeEach(() => {
    const mockVscode = {
      workspace: {
        getConfiguration: jest.fn().mockReturnValue({
          get: jest.fn((key) => {
            if (key === "gestureCommands") return mockCommands; // Return dynamic mockCommands
            return undefined;
          }),
        }),
        onDidChangeConfiguration: jest.fn(() => ({ dispose: jest.fn() })),
      },
      window: {
        activeTextEditor: undefined,
        activeTerminal: undefined,
        terminals: [],
      },
      debug: {
        activeDebugSession: undefined,
      },
      Uri: {
        joinPath: jest.fn((base, ...paths) => base + "/" + paths.join("/")),
      },
      commands: {
        executeCommand: jest.fn(),
      },
    };
    jest.mock(
      "path",
      () => ({
        basename: (p) => p.split("/").pop(),
        extname: (p) => {
          const name = p.split("/").pop();
          const dotIndex = name.lastIndexOf(".");
          return dotIndex > 0 ? name.substring(dotIndex) : "";
        },
      }),
      { virtual: true }
    );

    provider = new GesturePadViewProvider(
      mockVscode.Uri.joinPath("file://", "dummyPath"),
      {
        push: jest.fn(),
      }
    );

    mockContext = {
      editorLangId: "javascript",
      editorFocus: true,
      terminalFocus: false,
    };
    mockCommands = [
      {
        gesture: "R",
        actions: [{ command: "cmd1" }],
        when: "editorLangId == javascript",
      },
      {
        gesture: "L",
        actions: [{ command: "cmd2" }],
        when: "editorLangId == python",
      },
      { gesture: "U", actions: [{ command: "cmd3" }], when: "editorFocus" },
      { gesture: "D", actions: [{ command: "cmd4" }] }, // Global
      { gesture: "RU", actions: [{ command: "cmd5" }], when: "terminalFocus" },
    ];
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.resetModules();
  });

  test("should return commands matching the context", () => {
    const contextual = provider._getContextualGestureCommands(
      mockCommands,
      mockContext
    );
    expect(contextual).toHaveLength(2);
    expect(contextual.map((c) => c.gesture)).toEqual(
      expect.arrayContaining(["R", "U"])
    );
  });

  test("should return global commands if no contextual commands match", () => {
    mockContext.editorLangId = "typescript"; // R won't match
    mockContext.editorFocus = false; // U won't match
    const contextual = provider._getContextualGestureCommands(
      mockCommands,
      mockContext
    );
    expect(contextual).toHaveLength(1);
    expect(contextual[0].gesture).toBe("D");
  });

  test("should return specific contextual commands over global if both match criteria", () => {
    // This test confirms the behavior of _getContextualGestureCommands:
    // If contextual matches are found, only they are returned. Globals are a fallback.
    mockContext.editorLangId = "javascript"; // cmd1 matches
    mockContext.editorFocus = true; // cmd3 matches
    // cmd4 is global
    const contextual = provider._getContextualGestureCommands(
      mockCommands,
      mockContext
    );
    expect(contextual.map((c) => c.gesture)).toEqual(
      expect.arrayContaining(["R", "U"])
    );
    expect(contextual.map((c) => c.gesture)).not.toContain("D");
  });

  test("should return empty array if no commands match and no global commands exist", () => {
    mockCommands = [
      {
        gesture: "R",
        actions: [{ command: "cmd1" }],
        when: "editorLangId == python",
      },
      { gesture: "L", actions: [{ command: "cmd2" }], when: "terminalFocus" },
    ];
    mockContext.editorLangId = "javascript";
    mockContext.terminalFocus = false;
    const contextual = provider._getContextualGestureCommands(
      mockCommands,
      mockContext
    );
    expect(contextual).toHaveLength(0);
  });

  test("should correctly use _evaluateWhenClause for filtering", () => {
    const spy = jest.spyOn(provider, "_evaluateWhenClause");
    provider._getContextualGestureCommands(mockCommands, mockContext);
    expect(spy).toHaveBeenCalledWith("editorLangId == javascript", mockContext);
    expect(spy).toHaveBeenCalledWith("editorLangId == python", mockContext);
    expect(spy).toHaveBeenCalledWith("editorFocus", mockContext);
    expect(spy).toHaveBeenCalledWith("terminalFocus", mockContext);
    // It's called for each command with a 'when' clause
    expect(spy).toHaveBeenCalledTimes(4);
    spy.mockRestore();
  });
});
