import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  { languageOptions: { globals: globals.node } },
  // Configuration specifically for webview scripts
  {
    files: ["webview/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser, // Add standard browser globals like window, document
        acquireVsCodeApi: "readonly", // Add the specific VS Code webview global
      },
    },
  },
  pluginJs.configs.recommended,
];
