#!/bin/bash

# Update package repositories
echo "Updating package repositories..."
sudo apt-get update

# Install Node.js (using nodesource repository which is already set up)
echo "Installing Node.js..."
sudo apt-get install -y nodejs

# Check Node.js and npm versions
node_version=$(node -v)
npm_version=$(npm -v)
echo "Node.js version: $node_version"
echo "npm version: $npm_version"

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Install webpack and webpack-cli globally for easier testing
echo "Installing webpack and webpack-cli globally..."
sudo npm install -g webpack webpack-cli

# Create a basic webpack.config.js if it doesn't exist
if [ ! -f webpack.config.js ]; then
  echo "Creating a basic webpack.config.js file..."
  cat > webpack.config.js << 'EOL'
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/extension.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.js']
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'media', to: 'media', noErrorOnMissing: true }
      ]
    })
  ],
  mode: 'production'
};
EOL
fi

# Create a basic src/extension.js file if it doesn't exist
# This is to ensure the webpack build can run
if [ ! -d src ]; then
  echo "Creating src directory..."
  mkdir -p src
fi

if [ ! -f src/extension.js ]; then
  echo "Creating a basic src/extension.js file..."
  cat > src/extension.js << 'EOL'
// This is a placeholder extension.js file
const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    console.log('Extension "mouse-gestures" is now active!');
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
EOL
fi

# Add node_modules/.bin to PATH
echo 'export PATH="$PATH:./node_modules/.bin"' | sudo tee -a /etc/profile

# Source the updated profile
source /etc/profile

echo "Setup completed successfully!"