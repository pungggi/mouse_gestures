// Context evaluator for when clause expressions
const vscode = require("vscode");
const path = require("path");

/**
 * Evaluates when clause expressions similar to VS Code's keyboard shortcuts.
 * Uses a hybrid approach: event subscriptions for real-time accuracy on key
 * state changes, plus polling (100ms cache TTL) as a safety net.
 */
class ContextEvaluator {
  constructor(subscriptions) {
    this._contextCache = new Map();
    this._cacheTimeout = 100;
    this._lastCacheUpdate = 0;
    this._disposables = [];
    this._debuggersAvailableCache = null;
    this._debuggersAvailableCacheTime = 0;

    this._setupEventSubscriptions();

    if (subscriptions) {
      subscriptions.push({ dispose: () => this.dispose() });
    }
  }

  /**
   * Evaluates a when clause expression
   * @param {string} whenClause - The when clause expression to evaluate
   * @returns {boolean} - True if the condition is met, false otherwise
   */
  async evaluate(whenClause) {
    if (!whenClause || typeof whenClause !== 'string') {
      return true;
    }

    try {
      await this._updateContextCache();
      return this._evaluateExpression(whenClause.trim());
    } catch (error) {
      console.error(`Error evaluating when clause "${whenClause}":`, error);
      return false;
    }
  }

  /**
   * Sets up event subscriptions for real-time context tracking
   */
  _setupEventSubscriptions() {
    // Debug events
    this._disposables.push(
      vscode.debug.onDidStartDebugSession((session) => {
        this._contextCache.set('inDebugMode', true);
        this._contextCache.set('debugType', session.type);
        this._contextCache.set('debugState', 'running');
      }),
      vscode.debug.onDidTerminateDebugSession(() => {
        this._contextCache.set('inDebugMode', false);
        this._contextCache.set('debugType', undefined);
        this._contextCache.set('debugState', 'inactive');
      }),
      vscode.debug.onDidChangeActiveDebugSession((session) => {
        this._contextCache.set('inDebugMode', !!session);
        this._contextCache.set('debugType', session?.type);
        this._contextCache.set('debugState', session ? 'running' : 'inactive');
      })
    );

    // Active editor change
    this._disposables.push(
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this._updateEditorContextKeys(editor);
      })
    );

    // Selection changes — only update for the active editor
    this._disposables.push(
      vscode.window.onDidChangeTextEditorSelection((e) => {
        if (e.textEditor !== vscode.window.activeTextEditor) {
          return;
        }
        this._contextCache.set('editorHasSelection', !e.selections[0].isEmpty);
        this._contextCache.set('editorHasMultipleSelections', e.selections.length > 1);
        this._contextCache.set('editorLineNumber', e.selections[0].active.line + 1);
      })
    );

    // Editor dirty state
    this._disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && e.document === activeEditor.document) {
          this._contextCache.set('activeEditorIsDirty', e.document.isDirty);
          this._contextCache.set('editorIsDirty', e.document.isDirty);
        }
      }),
      vscode.workspace.onDidSaveTextDocument((doc) => {
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && doc === activeEditor.document) {
          this._contextCache.set('activeEditorIsDirty', false);
          this._contextCache.set('editorIsDirty', false);
        }
      })
    );

    // Terminal events
    // Note: onDidChangeActiveTerminal tracks which terminal is active, not
    // keyboard focus. VS Code has no API for terminal keyboard focus, so
    // 'terminalFocus' here means "an active terminal exists".
    this._disposables.push(
      vscode.window.onDidChangeActiveTerminal((terminal) => {
        this._contextCache.set('terminalFocus', !!terminal);
      }),
      vscode.window.onDidOpenTerminal(() => {
        this._contextCache.set('terminalIsOpen', vscode.window.terminals.length > 0);
        this._contextCache.set('terminalCount', vscode.window.terminals.length);
      }),
      vscode.window.onDidCloseTerminal(() => {
        // terminals array updates asynchronously after this event
        setTimeout(() => {
          this._contextCache.set('terminalIsOpen', vscode.window.terminals.length > 0);
          this._contextCache.set('terminalCount', vscode.window.terminals.length);
        }, 0);
      })
    );

    // Window focus change
    this._disposables.push(
      vscode.window.onDidChangeWindowState((state) => {
        this._contextCache.set('windowFocused', state.focused);
        this._contextCache.set('editorTextFocus', !!vscode.window.activeTextEditor && state.focused);
      })
    );

    // Initialize debug state from current session
    const currentSession = vscode.debug.activeDebugSession;
    this._contextCache.set('inDebugMode', !!currentSession);
    this._contextCache.set('debugType', currentSession?.type);
    this._contextCache.set('debugState', currentSession ? 'running' : 'inactive');

    // Initialize window and editor focus states
    this._contextCache.set('windowFocused', vscode.window.state.focused);
    this._updateEditorContextKeys(vscode.window.activeTextEditor);
  }

  /**
   * Updates editor-specific context keys from a given editor instance
   */
  _updateEditorContextKeys(editor) {
    this._contextCache.set('editorFocus', !!editor);
    this._contextCache.set('editorTextFocus', !!editor && vscode.window.activeTextEditor === editor && vscode.window.state.focused);
    this._contextCache.set('textInputFocus', !!editor);
    this._contextCache.set('inputFocus', !!editor);
    this._contextCache.set('activeEditorGroupEmpty', !editor);

    if (editor) {
      const doc = editor.document;
      this._contextCache.set('editorHasSelection', !editor.selection.isEmpty);
      this._contextCache.set('editorHasMultipleSelections', editor.selections.length > 1);
      this._contextCache.set('editorLangId', doc.languageId);
      this._contextCache.set('resourceScheme', doc.uri.scheme);
      this._contextCache.set('resourceFilename', path.basename(doc.fileName));
      this._contextCache.set('resourceExtname', path.extname(doc.fileName));
      this._contextCache.set('resourceLangId', doc.languageId);
      this._contextCache.set('isFileSystemResource', doc.uri.scheme === 'file');
      this._contextCache.set('resourceSet', true);
      this._contextCache.set('resource', doc.uri.toString());

      // New context keys
      this._contextCache.set('activeEditorIsDirty', doc.isDirty);
      this._contextCache.set('editorIsDirty', doc.isDirty);
      this._contextCache.set('resourceDirname', path.dirname(doc.fileName));
      this._contextCache.set('resourcePath', doc.uri.path);
      this._contextCache.set('editorLineNumber', editor.selection.active.line + 1);
      this._contextCache.set('activeEditorGroupIndex', editor.viewColumn || 1);
      this._contextCache.set('isInDiffEditor', this._isActiveTabDiff());

      // editorReadonly: URI-scheme heuristic (document.isReadonly does not exist in the API)
      const writableSchemes = ['file', 'untitled', 'vscode-userdata'];
      this._contextCache.set('editorReadonly', !writableSchemes.includes(doc.uri.scheme));
    } else {
      this._contextCache.set('editorHasSelection', false);
      this._contextCache.set('editorHasMultipleSelections', false);
      this._contextCache.set('editorReadonly', false);
      this._contextCache.set('resourceSet', false);
      this._contextCache.set('activeEditorIsDirty', false);
      this._contextCache.set('editorIsDirty', false);
      this._contextCache.set('activeEditorGroupEmpty', true);
    }
  }

  /**
   * Updates the context cache with current VS Code state (polling path)
   */
  async _updateContextCache() {
    const now = Date.now();
    if (now - this._lastCacheUpdate < this._cacheTimeout) {
      return;
    }
    this._lastCacheUpdate = now;

    try {
      // Editor contexts
      const activeEditor = vscode.window.activeTextEditor;
      this._updateEditorContextKeys(activeEditor);

      // Operating system contexts (static)
      this._contextCache.set('isLinux', process.platform === 'linux');
      this._contextCache.set('isMac', process.platform === 'darwin');
      this._contextCache.set('isWindows', process.platform === 'win32');
      this._contextCache.set('isWeb', vscode.env.uiKind === vscode.UIKind.Web);

      // Workspace contexts
      const workspaceFolders = vscode.workspace.workspaceFolders;
      this._contextCache.set('workspaceFolderCount', workspaceFolders ? workspaceFolders.length : 0);

      if (workspaceFolders && workspaceFolders.length === 1) {
        this._contextCache.set('workbenchState', 'folder');
      } else if (workspaceFolders && workspaceFolders.length > 1) {
        this._contextCache.set('workbenchState', 'workspace');
      } else {
        this._contextCache.set('workbenchState', 'empty');
      }

      // Editor group contexts (tabGroups API available since VS Code 1.67, engine requires >=1.80)
      const visibleEditors = vscode.window.visibleTextEditors;
      this._contextCache.set('editorIsOpen', visibleEditors.length > 0);
      this._contextCache.set('multipleEditorGroups', this._getEditorGroupCount() > 1);
      this._contextCache.set('groupEditorsCount', this._getActiveGroupEditorCount());
      this._contextCache.set('activeEditorGroupLast', this._isLastEditorGroup());

      // Terminal contexts (supplemented by events)
      this._contextCache.set('terminalFocus', !!vscode.window.activeTerminal);
      this._contextCache.set('terminalIsOpen', vscode.window.terminals.length > 0);
      this._contextCache.set('terminalCount', vscode.window.terminals.length);

      // Debug contexts (supplemented by events, poll as safety net)
      const debugSession = vscode.debug.activeDebugSession;
      this._contextCache.set('inDebugMode', !!debugSession);
      this._contextCache.set('debugType', debugSession?.type);
      this._contextCache.set('debugState', debugSession ? 'running' : 'inactive');
      this._contextCache.set('debuggersAvailable', this._hasDebuggerExtensions());

      // Window state
      this._contextCache.set('windowFocused', vscode.window.state.focused);

    } catch (error) {
      console.error('Error updating context cache:', error);
    }
  }

  /**
   * Returns the number of editor groups using the tabGroups API
   */
  _getEditorGroupCount() {
    if (vscode.window.tabGroups) {
      return vscode.window.tabGroups.all.length;
    }
    const columns = new Set(
      vscode.window.visibleTextEditors.map(e => e.viewColumn).filter(Boolean)
    );
    return columns.size || 1;
  }

  /**
   * Returns the number of editors/tabs in the active group
   */
  _getActiveGroupEditorCount() {
    if (vscode.window.tabGroups) {
      const activeGroup = vscode.window.tabGroups.activeTabGroup;
      return activeGroup ? activeGroup.tabs.length : 0;
    }
    // Conservative fallback: visibleTextEditors spans all groups, so return 1
    // to avoid overstating the active group size on older VS Code versions
    return 1;
  }

  /**
   * Returns true if the active tab is a diff editor, using the tabGroups API
   */
  _isActiveTabDiff() {
    if (vscode.window.tabGroups) {
      const activeTab = vscode.window.tabGroups.activeTabGroup?.activeTab;
      if (activeTab) {
        // TabInputTextDiff has 'original' and 'modified' properties
        return !!(activeTab.input && activeTab.input.original && activeTab.input.modified);
      }
    }
    return false;
  }

  /**
   * Returns true if the active editor group is the last one
   */
  _isLastEditorGroup() {
    if (vscode.window.tabGroups) {
      const groups = vscode.window.tabGroups.all;
      const activeGroup = vscode.window.tabGroups.activeTabGroup;
      if (groups.length === 0) return true;
      return groups[groups.length - 1] === activeGroup;
    }
    return true;
  }

  /**
   * Checks if any installed extension contributes debuggers (cached for 30s)
   */
  _hasDebuggerExtensions() {
    const now = Date.now();
    if (now - this._debuggersAvailableCacheTime < 30000) {
      return this._debuggersAvailableCache;
    }
    this._debuggersAvailableCache = vscode.extensions.all.some(ext => {
      const contributes = ext.packageJSON?.contributes;
      return contributes && Array.isArray(contributes.debuggers) && contributes.debuggers.length > 0;
    });
    this._debuggersAvailableCacheTime = now;
    return this._debuggersAvailableCache;
  }

  /**
   * Gets a context value, handling special cases like config.* keys
   */
  _getContextValue(key) {
    if (key.startsWith('config.')) {
      const configKey = key.substring(7);
      try {
        const config = vscode.workspace.getConfiguration();
        return config.get(configKey);
      } catch (error) {
        console.error(`Error getting config value for ${configKey}:`, error);
        return undefined;
      }
    }

    return this._contextCache.get(key);
  }

  /**
   * Evaluates a when clause expression
   */
  _evaluateExpression(expression) {
    // Handle parentheses first
    expression = this._evaluateParentheses(expression);

    // Handle logical operators (OR has lowest precedence)
    if (expression.includes('||')) {
      const parts = this._splitByOperator(expression, '||');
      return parts.some(part => this._evaluateExpression(part.trim()));
    }

    // Handle AND operator
    if (expression.includes('&&')) {
      const parts = this._splitByOperator(expression, '&&');
      return parts.every(part => this._evaluateExpression(part.trim()));
    }

    // Handle NOT operator
    if (expression.startsWith('!')) {
      const innerExpression = expression.substring(1).trim();
      return !this._evaluateExpression(innerExpression);
    }

    // Handle comparison operators
    const comparisonMatch = expression.match(/^(.+?)\s*(==|!=|>=|<=|>|<|=~|in|not\s+in)\s*(.+)$/);
    if (comparisonMatch) {
      const [, left, operator, right] = comparisonMatch;
      return this._evaluateComparison(left.trim(), operator.trim(), right.trim());
    }

    // Handle boolean literals
    if (expression === "true") {
      return true;
    }
    if (expression === "false") {
      return false;
    }

    // Handle simple context key
    const value = this._getContextValue(expression);
    return this._isTruthy(value);
  }

  /**
   * Evaluates parentheses in expressions
   */
  _evaluateParentheses(expression) {
    while (expression.includes('(')) {
      const start = expression.lastIndexOf('(');
      const end = expression.indexOf(')', start);
      if (end === -1) {
        throw new Error('Mismatched parentheses in expression');
      }

      const innerExpression = expression.substring(start + 1, end);
      const result = this._evaluateExpression(innerExpression);
      const resultStr = result ? "true" : "false";
      expression = expression.substring(0, start) + resultStr + expression.substring(end + 1);
    }
    return expression;
  }

  /**
   * Splits expression by operator, respecting parentheses
   */
  _splitByOperator(expression, operator) {
    const parts = [];
    let current = '';
    let depth = 0;
    let i = 0;

    while (i < expression.length) {
      const char = expression[i];

      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      } else if (depth === 0 && expression.substring(i, i + operator.length) === operator) {
        parts.push(current);
        current = '';
        i += operator.length - 1;
      } else {
        current += char;
      }
      i++;
    }

    if (current) {
      parts.push(current);
    }

    return parts;
  }

  /**
   * Evaluates comparison expressions
   */
  _evaluateComparison(left, operator, right) {
    const leftValue = this._getContextValue(left);

    let rightValue = right;
    if ((right.startsWith('"') && right.endsWith('"')) ||
        (right.startsWith("'") && right.endsWith("'"))) {
      rightValue = right.slice(1, -1);
    }

    switch (operator) {
      case '==':
      case '===':
        return leftValue == rightValue;

      case '!=':
      case '!==':
        return leftValue != rightValue;

      case '>':
        return Number(leftValue) > Number(rightValue);

      case '>=':
        return Number(leftValue) >= Number(rightValue);

      case '<':
        return Number(leftValue) < Number(rightValue);

      case '<=':
        return Number(leftValue) <= Number(rightValue);

      case '=~':
        try {
          const regexMatch = rightValue.match(/^\/(.+)\/([gimsu]*)$/);
          if (regexMatch) {
            const [, pattern, flags] = regexMatch;
            const regex = new RegExp(pattern, flags);
            return regex.test(String(leftValue));
          } else {
            const regex = new RegExp(rightValue);
            return regex.test(String(leftValue));
          }
        } catch (error) {
          console.error(`Invalid regex in when clause: ${rightValue}`, error);
          return false;
        }

      case 'in': {
        const inValue = this._getContextValue(rightValue);
        if (Array.isArray(inValue)) {
          return inValue.includes(leftValue);
        } else if (typeof inValue === 'object' && inValue !== null) {
          return leftValue in inValue;
        }
        return false;
      }
      case 'not in': {
        const notInValue = this._getContextValue(rightValue);
        if (Array.isArray(notInValue)) {
          return !notInValue.includes(leftValue);
        } else if (typeof notInValue === 'object' && notInValue !== null) {
          return !(leftValue in notInValue);
        }
        return true;
      }

      default:
        console.error(`Unknown comparison operator: ${operator}`);
        return false;
    }
  }

  /**
   * Determines if a value is truthy in the context of when clauses
   */
  _isTruthy(value) {
    if (value === undefined || value === null) {
      return false;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number') {
      return value !== 0;
    }
    if (typeof value === 'string') {
      return value.length > 0;
    }
    return !!value;
  }

  /**
   * Clears the context cache
   */
  clearCache() {
    this._contextCache.clear();
    this._lastCacheUpdate = 0;
  }

  /**
   * Disposes all event subscriptions and clears the cache
   */
  dispose() {
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables = [];
    this._contextCache.clear();
  }
}

module.exports = { ContextEvaluator };
