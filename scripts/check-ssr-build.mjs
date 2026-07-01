#!/usr/bin/env node
/**
 * SSR build verification.
 *
 *   1. Runs the module-scope browser-global scanner
 *      (scripts/check-ssr-leaks.mjs) over src/.
 *   2. Runs the production build (`bun run build`).
 *   3. Confirms the SSR bundle emitted `dist/server/index.mjs`.
 *
 * Fails with a non-zero exit code if any step fails, so CI blocks
 * merges that introduce SSR leaks or break the server bundle.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function run(label, cmd, args) {
  console.log(`\n[check-ssr-build] ${label}: ${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false, cwd: ROOT });
  if (res.status !== 0) {
    console.error(`[check-ssr-build] ${label} failed (exit ${res.status})`);
    process.exit(res.status ?? 1);
  }
}

run("Module-scope browser-global scan", "node", ["scripts/check-ssr-leaks.mjs"]);
run("Production build", "bun", ["run", "build"]);

const entry = join(ROOT, "dist", "server", "index.mjs");
if (!existsSync(entry)) {
  console.error(`[check-ssr-build] Missing ${entry} — SSR bundle did not emit.`);
  process.exit(1);
}

console.log("\n[check-ssr-build] OK — no SSR leaks, production build succeeded, SSR entry present.");
