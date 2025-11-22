// State tracker for the find widget's visibility
let isFindWidgetVisible = false;

/**
 * Get the current visibility state of the find widget.
 * @returns {boolean} `true` if the find widget is visible, `false` otherwise.
 */
function getFindWidgetVisible() {
  return isFindWidgetVisible;
}

/**
 * Update the module-level flag tracking whether the find widget is visible.
 * @param {boolean} isVisible - `true` to mark the find widget as visible, `false` to mark it as hidden.
 */
function setFindWidgetVisible(isVisible) {
  isFindWidgetVisible = isVisible;
}

module.exports = {
  getFindWidgetVisible,
  setFindWidgetVisible,
};
