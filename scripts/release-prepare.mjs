#!/usr/bin/env node
/**
 * Lockstep release — prepare step.
 *
 * Called by semantic-release via @semantic-release/exec with the next version.
 * Sets that version on the root and every package manifest, refreshes the
 * lockfile and builds, so a single tag versions and releases the whole repo
 * together.
 *
 *   node scripts/release-prepare.mjs <version>
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];

if (!version) {
  console.error("release-prepare: missing version argument");
  process.exit(1);
}

/** Every package.json in the workspace, root first. */
export function packageManifests(base = root) {
  const paths = [join(base, "package.json")];
  for (const group of ["packages", "packages/connectors"]) {
    const dir = join(base, group);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(dir, entry.name, "package.json");
      if (existsSync(manifest)) paths.push(manifest);
    }
  }
  return paths;
}

for (const manifest of packageManifests()) {
  const json = JSON.parse(readFileSync(manifest, "utf8"));
  json.version = version;
  writeFileSync(manifest, `${JSON.stringify(json, null, 2)}\n`);
  console.log(`release-prepare: ${manifest.slice(root.length + 1)} → ${version}`);
}

execSync("bun install", { stdio: "inherit", cwd: root });
execSync("bun run build", { stdio: "inherit", cwd: root });
