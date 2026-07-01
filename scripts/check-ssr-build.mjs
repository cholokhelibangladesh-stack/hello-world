#!/usr/bin/env node
/**
 * SSR build verification.
 *
 * 1. Runs `bun run build` (production).
 * 2. Scans the generated server bundle (`dist/server/**`) for browser
 *    global references that would throw at request time in the Cloudflare
 *    Worker runtime (window / document / localStorage / sessionStorage /
 *    navigator) when they appear as unqualified identifiers.
 * 3. Fails with a non-zero exit code if any are found, or if the build
 *    itself failed.
 *
 * Third-party UMD/IIFE shims frequently reference `window` inside a
 * `typeof window !== "undefined"` guard — those are filtered out.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SERVER_DIR = join(ROOT, "dist", "server");

function run(cmd, args) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (res.status !== 0) {
    console.error(`\n[check-ssr-build] '${cmd} ${args.join(" ")}' failed with exit ${res.status}`);
    process.exit(res.status ?? 1);
  }
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(mjs|js|cjs)$/.test(name)) out.push(p);
  }
  return out;
}

// Match a bare identifier read: not preceded by `.`, `typeof `, letter, digit, `_`, `$`.
const GLOBALS = ["window", "document", "localStorage", "sessionStorage", "navigator"];
const BARE = new RegExp(
  `(^|[^\\w$.])(${GLOBALS.join("|")})\\s*(\\.|\\[|\\()`,
  "g",
);
// Ignore matches guarded by typeof.
const GUARDED = /typeof\s+(window|document|localStorage|sessionStorage|navigator)\s*[!=]==?\s*["']undefined["']/;

console.log("[check-ssr-build] Running production build...");
run("bun", ["run", "build"]);

if (!existsSync(SERVER_DIR)) {
  console.error(`[check-ssr-build] Missing ${SERVER_DIR} — SSR build did not emit.`);
  process.exit(1);
}

const APP_ONLY = /\/(_ssr|assets)\//; // limit scan to app-authored server chunks
const files = walk(SERVER_DIR).filter((f) => APP_ONLY.test(f) || /\/index\.mjs$/.test(f));
const violations = [];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  for (const match of src.matchAll(BARE)) {
    const idx = match.index ?? 0;
    const start = Math.max(0, idx - 80);
    const end = Math.min(src.length, idx + match[0].length + 40);
    const snippet = src.slice(start, end);
    if (GUARDED.test(snippet)) continue;
    violations.push({ file: relative(ROOT, file), name: match[2], snippet: snippet.replace(/\s+/g, " ").trim() });
  }
}

if (violations.length > 0) {
  console.error(`\n[check-ssr-build] Found ${violations.length} unguarded browser-global reference(s) in the SSR bundle:`);
  for (const v of violations.slice(0, 20)) {
    console.error(`  - ${v.file}: ${v.name}\n      ${v.snippet}`);
  }
  if (violations.length > 20) console.error(`  ...and ${violations.length - 20} more`);
  process.exit(1);
}

console.log(`[check-ssr-build] OK — scanned ${files.length} server chunk(s), no unguarded browser globals.`);
