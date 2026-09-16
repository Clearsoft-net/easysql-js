#!/usr/bin/env node
/**
 * Lockstep guard: the root and every package must share the same version.
 * Release publishes them together, so a manual bump that drifts must fail CI.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function manifests(base = root) {
  const paths = [{ path: join(base, "package.json"), label: "root" }];
  for (const group of ["packages", "packages/connectors"]) {
    const dir = join(base, group);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = join(dir, entry.name, "package.json");
      if (existsSync(manifest)) {
        paths.push({ path: manifest, label: `${group}/${entry.name}` });
      }
    }
  }
  return paths;
}

const expected = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
const mismatches = [];
for (const { path, label } of manifests()) {
  const { version, name } = JSON.parse(readFileSync(path, "utf8"));
  if (version !== expected) mismatches.push(`${label} (${name}): ${version}`);
}

if (mismatches.length > 0) {
  console.error(`Versions are not in lockstep — expected ${expected}:`);
  for (const line of mismatches) console.error(`  - ${line}`);
  process.exit(1);
}
console.log(`✓ versions in lockstep at ${expected}`);
