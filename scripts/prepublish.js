/**
 * Runs BEFORE vsce/ovsx read and pack package.json (invoked by
 * scripts/publish.js, or by vsce via the "vscode:prepublish" npm hook).
 *
 * 1. Builds the production webpack bundle into dist/
 * 2. Swaps the main entry point to the distribution file
 *
 * Version bumps are handled by the vsce-publish skill's bump.mjs — never
 * here (the legacy auto-patch-bump was removed when this repo joined the
 * standard pipeline).
 *
 * scripts/afterpublish.js reverts the main entry point and cleans dist/.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const packageJsonPath = path.join(root, "package.json");

try {
  // Production bundle (dist/extension.js)
  execSync("npx webpack --mode=production", { stdio: "inherit", cwd: root });

  // Update main entry point to point to the distribution file
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  pkg.main = "./dist/extension.js";
  fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log(`Updated main to ${pkg.main}`);
} catch (error) {
  console.error("Error in prepublish script:", error.message);
  process.exit(1);
}
