/**
 * esbuild configuration for building the paperclipai CLI for npm.
 *
 * Bundles all workspace packages (@paperclipai/*) into a single file.
 * External npm packages remain as regular dependencies.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

// Workspace packages whose code should be bundled into the CLI.
// Note: "server" is excluded — it's published separately and resolved at runtime.
const workspacePaths = [
  "cli",
  "packages/db",
  "packages/shared",
  "packages/adapter-utils",
  "packages/adapters/claude-local",
  "packages/adapters/codex-local",
  "packages/adapters/openclaw-gateway",
];

// Workspace packages that should NOT be bundled — they'll be published
// to npm and resolved at runtime (e.g. @paperclipai/server uses dynamic import).
const externalWorkspacePackages = new Set([
  "@paperclipai/server",
]);

// Externals policy: bundle every npm dep into the output so the CLI is
// self-contained at runtime. Keep external only:
//   1. Published workspace packages we resolve dynamically (e.g. server)
//   2. Optional dependencies, which are typically native modules
//   3. Packages that ship binaries via __dirname lookups (embedded-postgres)
const externals = new Set();
for (const p of workspacePaths) {
  const pkg = JSON.parse(readFileSync(resolve(repoRoot, p, "package.json"), "utf8"));
  for (const name of Object.keys(pkg.optionalDependencies || {})) {
    externals.add(name);
  }
}
for (const name of externalWorkspacePackages) {
  externals.add(name);
}
externals.add("embedded-postgres");

/** @type {import('esbuild').BuildOptions} */
export default {
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/index.js",
  banner: {
    js: `#!/usr/bin/env node
import { createRequire as __pcCreateRequire } from "node:module";
const require = __pcCreateRequire(import.meta.url);`,
  },
  external: [...externals].sort(),
  treeShaking: true,
  sourcemap: true,
};
