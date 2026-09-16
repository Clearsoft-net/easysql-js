#!/usr/bin/env node
/**
 * Lockstep release — publish step.
 *
 * Called by semantic-release via @semantic-release/exec after the prepare step
 * has set the same version on every package. Publishes every non-private
 * package to npm. Without an npm token (e.g. a dry run) it reports what it
 * would publish and exits successfully.
 *
 *   node scripts/release-publish.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hasToken = Boolean(process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN);

function packageManifests(base = root) {
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
  // The root manifest is the workspace aggregator, never a published package.
  if (dirname(manifest) === root || json.private) {
    console.log(`release-publish: skipping ${json.name}`);
    continue;
  }
  if (!hasToken) {
    console.log(`release-publish: no npm token — would publish ${json.name}@${json.version}`);
    continue;
  }
  console.log(`release-publish: publishing ${json.name}@${json.version}`);
  execFileSync("bun", ["publish", "--access", "public"], {
    cwd: dirname(manifest),
    stdio: "inherit",
    env: process.env,
  });
}
