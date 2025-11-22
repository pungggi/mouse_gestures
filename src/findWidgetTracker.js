// State tracker for the find widget's visibility
let isFindWidgetVisible = false;

function getFindWidgetVisible() {
  return isFindWidgetVisible;
}

function setFindWidgetVisible(isVisible) {
  isFindWidgetVisible = isVisible;
}

module.exports = {
  getFindWidgetVisible,
  setFindWidgetVisible,
};
