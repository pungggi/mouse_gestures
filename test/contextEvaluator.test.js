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


const assert = require('assert');
const { setFindWidgetVisible } = require('../src/findWidgetTracker');


async function runTests() {
  console.log('Testing Context Evaluator...');

  // require the context evaluator inside the test function to avoid caching issues
  const { ContextEvaluator } = require('../src/contextEvaluator');
  const evaluator = new ContextEvaluator();

  // Test simple context keys
  console.log('Testing simple context keys:');
  assert.strictEqual(await evaluator.evaluate('editorTextFocus'), true, 'editorTextFocus should be true');
  assert.strictEqual(await evaluator.evaluate('editorLangId == typescript'), true, 'editorLangId should be typescript');
  assert.strictEqual(await evaluator.evaluate('editorLangId == javascript'), false, 'editorLangId should not be javascript');

  // Test findWidgetVisible
  setFindWidgetVisible(true);
  evaluator.clearCache();
  assert.strictEqual(await evaluator.evaluate('findWidgetVisible'), true, 'findWidgetVisible should be true');

  setFindWidgetVisible(false);
  evaluator.clearCache();
  assert.strictEqual(await evaluator.evaluate('findWidgetVisible'), false, 'findWidgetVisible should be false');


  // Test logical operators
  console.log('\nTesting logical operators:');
  assert.strictEqual(await evaluator.evaluate('editorTextFocus && editorLangId == typescript'), true, 'editorTextFocus and editorLangId == typescript should be true');
  assert.strictEqual(await evaluator.evaluate('editorLangId == typescript || editorLangId == javascript'), true, 'editorLangId == typescript or editorLangId == javascript should be true');
  assert.strictEqual(await evaluator.evaluate('!terminalFocus'), true, '!terminalFocus should be true');

  // Test configuration
  console.log('\nTesting configuration:');
  assert.strictEqual(await evaluator.evaluate('config.editor.minimap.enabled'), true, 'config.editor.minimap.enabled should be true');

  console.log('\nAll tests completed!');
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
