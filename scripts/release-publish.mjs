#!/usr/bin/env node
/**
 * Lockstep release — publish step.
 *
 * Called by semantic-release via @semantic-release/exec after the prepare step
 * has set the same version on every package. Publishes every non-private
 * package to npm.
 *
 * `bun publish` authenticates with NPM_CONFIG_TOKEN (it does not read
 * NPM_TOKEN), so the token is mapped across before spawning. A missing token is
 * a hard error: a release must never succeed without publishing.
 *
 *   node scripts/release-publish.mjs
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const token = process.env.NPM_CONFIG_TOKEN ?? process.env.NPM_TOKEN ?? process.env.NODE_AUTH_TOKEN;
// Optional filters for targeted (re)publishes, e.g. PUBLISH_PACKAGE=common.
const filter = process.env.PUBLISH_PACKAGE;
const verbose = process.env.PUBLISH_VERBOSE === "1";

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

const publishable = [];
for (const manifest of packageManifests()) {
  const json = JSON.parse(readFileSync(manifest, "utf8"));
  // The root manifest is the workspace aggregator, never a published package.
  if (dirname(manifest) === root || json.private) {
    console.log(`release-publish: skipping ${json.name}`);
    continue;
  }
  if (filter && !json.name.includes(filter)) {
    console.log(`release-publish: skipping ${json.name} (filter: ${filter})`);
    continue;
  }
  publishable.push({ manifest, json });
}

if (publishable.length > 0 && !token) {
  console.error(
    "release-publish: no npm token found. Set NPM_CONFIG_TOKEN (or NPM_TOKEN) with publish rights.",
  );
  process.exit(1);
}

for (const { manifest, json } of publishable) {
  console.log(`release-publish: publishing ${json.name}@${json.version}`);
  const args = ["publish", "--access", "public"];
  if (verbose) args.push("--verbose");
  execFileSync("bun", args, {
    cwd: dirname(manifest),
    stdio: "inherit",
    env: { ...process.env, NPM_CONFIG_TOKEN: token },
  });
}
