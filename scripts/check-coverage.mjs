#!/usr/bin/env node
/**
 * Runs the whole test suite with lcov coverage and fails when line coverage is
 * below the threshold (COVERAGE_THRESHOLD, default 80).
 */

import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const threshold = Number(process.env.COVERAGE_THRESHOLD ?? "80");
const dir = join(root, ".coverage");

rmSync(dir, { recursive: true, force: true });
execFileSync("bun", ["test", "--coverage", "--coverage-reporter=lcov", "--coverage-dir", dir], {
  cwd: root,
  stdio: "inherit",
});

const lcov = readFileSync(join(dir, "lcov.info"), "utf8");
let total = 0;
let covered = 0;
let scope = "";
for (const line of lcov.split("\n")) {
  if (line.startsWith("SF:")) {
    // Hand-written source only: skip generated code and the codegen scripts.
    const file = line.slice(3);
    scope = file.includes("src/") && !file.includes("packages/client/src/") ? file : "";
    continue;
  }
  if (!scope || !line.startsWith("DA:")) continue;
  total += 1;
  if (Number(line.split(",")[1]) > 0) covered += 1;
}

const percent = total === 0 ? 0 : (covered / total) * 100;
const rounded = Math.round(percent * 100) / 100;
console.log(`\nline coverage: ${covered}/${total} = ${rounded}% (threshold ${threshold}%)`);
if (rounded < threshold) {
  console.error(`Coverage ${rounded}% is below the ${threshold}% threshold.`);
  process.exit(1);
}
