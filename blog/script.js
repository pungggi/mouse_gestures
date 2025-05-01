/* global Prism */
// Check if Prism.js is loaded
if (typeof Prism !== "undefined") {
  // Prism.js is loaded, proceed with syntax highlighting
  Prism.highlightAll();
} else {
  // Prism.js is not loaded, log a message (for debugging purposes)
  console.log(
    "Prism.js is not loaded. Syntax highlighting will not be applied."
  );
}
