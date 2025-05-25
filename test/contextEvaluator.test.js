// Simple test for context evaluator

// Mock VS Code API
const mockVscode = {
  window: {
    activeTextEditor: {
      document: {
        languageId: 'typescript',
        fileName: 'test.ts',
        uri: { scheme: 'file', toString: () => 'file:///test.ts' },
        isUntitled: false
      },
      selection: { isEmpty: false },
      selections: [{}]
    },
    activeTerminal: null,
    visibleTextEditors: [{}],
    terminals: []
  },
  workspace: {
    workspaceFolders: [{ name: 'test' }],
    getConfiguration: () => ({
      get: (key) => {
        if (key === 'editor.minimap.enabled') return true;
        return undefined;
      }
    })
  },
  env: {
    uiKind: 1 // Desktop
  },
  UIKind: { Web: 2, Desktop: 1 }
};

// Mock the vscode module
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

// Now require the context evaluator
const { ContextEvaluator } = require('../src/contextEvaluator');

async function runTests() {
  console.log('Testing Context Evaluator...');

  const evaluator = new ContextEvaluator();

  // Test simple context keys
  console.log('Testing simple context keys:');
  console.log('editorTextFocus:', await evaluator.evaluate('editorTextFocus'));
  console.log('editorLangId == typescript:', await evaluator.evaluate('editorLangId == typescript'));
  console.log('editorLangId == javascript:', await evaluator.evaluate('editorLangId == javascript'));

  // Test logical operators
  console.log('\nTesting logical operators:');
  console.log('editorTextFocus && editorLangId == typescript:', await evaluator.evaluate('editorTextFocus && editorLangId == typescript'));
  console.log('editorLangId == typescript || editorLangId == javascript:', await evaluator.evaluate('editorLangId == typescript || editorLangId == javascript'));
  console.log('!terminalFocus:', await evaluator.evaluate('!terminalFocus'));

  // Test configuration
  console.log('\nTesting configuration:');
  console.log('config.editor.minimap.enabled:', await evaluator.evaluate('config.editor.minimap.enabled'));

  // Test invalid expressions
  console.log('\nTesting invalid expressions:');
  console.log('invalid expression:', await evaluator.evaluate('invalid && ('));

  console.log('\nAll tests completed!');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
