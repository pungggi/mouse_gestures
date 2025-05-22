module.exports = {
  // preset: 'ts-jest/presets/default-esm', // Removed ESM preset
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  testEnvironment: "node",
  transform: {
    // Use ts-jest for .ts/.tsx files only
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        /* ts-jest config can go here */
      },
    ],
    // Babel-jest can be added here if needed for advanced JS features not supported by current Node
    // For now, relying on Node's native JS support for .js files
  },
  // moduleNameMapper: { // Not strictly needed for CJS if paths are standard
  //   '^(\\.{1,2}/.*)\\.js$': '$1',
  // },
  testMatch: ["**/__tests__/**/*.test.(ts|js)"],
  // globals: { // Deprecated
  //   'ts-jest': {
  //     useESM: true,
  //   },
  // },
};
