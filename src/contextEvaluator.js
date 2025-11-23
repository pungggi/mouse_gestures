// Context evaluator for when clause expressions
const vscode = require("vscode");
const path = require("path");



/**
 * Evaluates when clause expressions similar to VS Code's keyboard shortcuts
 */
class ContextEvaluator {
  constructor() {
    // Cache for context values to avoid repeated API calls
    this._contextCache = new Map();
    this._cacheTimeout = 100; // Cache for 100ms to balance performance and accuracy
    this._lastCacheUpdate = 0;
  }

  /**
   * Evaluates a when clause expression
   * @param {string} whenClause - The when clause expression to evaluate
   * @returns {boolean} - True if the condition is met, false otherwise
   */
  async evaluate(whenClause) {
    if (!whenClause || typeof whenClause !== 'string') {
      return true; // No condition means always active
    }

    try {
      // Update context cache if needed
      await this._updateContextCache();
      
      // Parse and evaluate the expression
      return this._evaluateExpression(whenClause.trim());
    } catch (error) {
      console.error(`Error evaluating when clause "${whenClause}":`, error);
      return false; // Default to false on error
    }
  }

  /**
   * Updates the context cache with current VS Code state
   */
  async _updateContextCache() {
    const now = Date.now();
    if (now - this._lastCacheUpdate < this._cacheTimeout) {
      return; // Cache is still fresh
    }

    this._contextCache.clear();
    this._lastCacheUpdate = now;

    try {
      // Editor contexts
      const activeEditor = vscode.window.activeTextEditor;
      this._contextCache.set('editorFocus', !!activeEditor);
      this._contextCache.set('editorTextFocus', !!activeEditor && !vscode.window.activeTerminal);
      this._contextCache.set('textInputFocus', !!activeEditor);
      this._contextCache.set('inputFocus', !!activeEditor);
      
      if (activeEditor) {
        this._contextCache.set('editorHasSelection', !activeEditor.selection.isEmpty);
        this._contextCache.set('editorHasMultipleSelections', activeEditor.selections.length > 1);
        this._contextCache.set('editorReadonly', activeEditor.document.isReadonly);
        this._contextCache.set('editorLangId', activeEditor.document.languageId);
        this._contextCache.set('resourceScheme', activeEditor.document.uri.scheme);
        this._contextCache.set('resourceFilename', path.basename(activeEditor.document.fileName));
        this._contextCache.set('resourceExtname', path.extname(activeEditor.document.fileName));
        this._contextCache.set('resourceLangId', activeEditor.document.languageId);
        this._contextCache.set('isFileSystemResource', activeEditor.document.uri.scheme === 'file');
        this._contextCache.set('resourceSet', true);
        this._contextCache.set('resource', activeEditor.document.uri.toString());
      } else {
        this._contextCache.set('editorHasSelection', false);
        this._contextCache.set('editorHasMultipleSelections', false);
        this._contextCache.set('editorReadonly', false);
        this._contextCache.set('resourceSet', false);
      }

      // Operating system contexts
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

      // Editor group contexts
      const visibleEditors = vscode.window.visibleTextEditors;
      this._contextCache.set('editorIsOpen', visibleEditors.length > 0);
      this._contextCache.set('multipleEditorGroups', visibleEditors.length > 1);



      // Terminal contexts
      this._contextCache.set('terminalFocus', !!vscode.window.activeTerminal);
      this._contextCache.set('terminalIsOpen', vscode.window.terminals.length > 0);

      // Get configuration values for config.* contexts
      // These will be handled dynamically in _getContextValue

    } catch (error) {
      console.error('Error updating context cache:', error);
    }
  }

  /**
   * Gets a context value, handling special cases like config.* keys
   */
  _getContextValue(key) {
    // Handle configuration keys
    if (key.startsWith('config.')) {
      const configKey = key.substring(7); // Remove 'config.' prefix
      try {
        const config = vscode.workspace.getConfiguration();
        return config.get(configKey);
      } catch (error) {
        console.error(`Error getting config value for ${configKey}:`, error);
        return undefined;
      }
    }

    // Handle view visibility contexts
    if (key.startsWith('view.') && key.endsWith('.visible')) {
      // For now, we'll return undefined for view visibility as it requires more complex tracking
      // This could be enhanced in the future
      return undefined;
    }

    // Handle activeViewlet, activePanel contexts
    // These would require tracking the current active view containers
    // For now, we'll return undefined and could enhance this later
    if (key === 'activeViewlet' || key === 'activePanel' || key === 'activeAuxiliary') {
      return undefined;
    }

    // Handle focusedView
    if (key === 'focusedView') {
      return undefined; // Would need complex tracking
    }

    // Handle extension contexts
    if (key.startsWith('extension')) {
      return undefined; // Would need extension API access
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
      // Replace with string representation that will be recognized as boolean literal
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
    
    // Handle string literals (remove quotes)
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
          // Extract regex pattern from /pattern/flags format
          const regexMatch = rightValue.match(/^\/(.+)\/([gimsu]*)$/);
          if (regexMatch) {
            const [, pattern, flags] = regexMatch;
            const regex = new RegExp(pattern, flags);
            return regex.test(String(leftValue));
          } else {
            // Treat as literal string if not in regex format
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
   * Clears the context cache (useful for testing or manual refresh)
   */
  clearCache() {
    this._contextCache.clear();
    this._lastCacheUpdate = 0;
  }
}

module.exports = { ContextEvaluator };
