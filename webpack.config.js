const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/extension.js",
  target: "node",
  mode: "production",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
  },
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    extensions: [".js"],
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "src/gestureRecognitionCore.js",
          to: "src/gestureRecognitionCore.js",
        },
        {
          from: "test_gesture_recognition.html",
          to: "test_gesture_recognition.html",
        },
      ],
    }),
  ],
};
