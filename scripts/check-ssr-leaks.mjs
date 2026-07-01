#!/usr/bin/env node
/**
 * Fails when any file under src/ reads a browser-only global
 * (window, document, localStorage, sessionStorage, navigator) at
 * module scope. Module-scope reads crash SSR on the Cloudflare Worker
 * runtime because the browser globals do not exist until hydration.
 *
 * Allowed:
 *   - inside a function body (useEffect, event handler, hook, etc.)
 *   - inside a `<ClientOnly>` render callback
 *   - inside a `typeof window !== "undefined"` guard
 *   - inside a `*.server.ts(x)` file, `src/routes/api/**`, or
 *     `src/integrations/**` (auto-generated / server-only)
 *
 * Implementation: strips strings/comments, then tracks `{ }` depth
 * line-by-line. Any match found while depth === 0 is a violation.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const IGNORE = [
  /src\/routeTree\.gen\.ts$/,
  /src\/integrations\//,
  /\.server\.tsx?$/,
  /src\/routes\/api\//,
];

const GLOBALS = ["window", "document", "localStorage", "sessionStorage", "navigator"];
const BARE = new RegExp(`(^|[^\\w$.])(${GLOBALS.join("|")})\\s*(\\.|\\[|\\()`);
const GUARD = /typeof\s+(window|document|localStorage|sessionStorage|navigator)\s*[!=]==?\s*["']undefined["']/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

/** Remove strings, template literals, and comments so their contents don't
 *  disturb brace-depth tracking or produce false-positive matches. */
function sanitize(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], nx = src[i + 1];
    if (c === "/" && nx === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && nx === "*") { i += 2; while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++; i += 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; out += " "; i++;
      while (i < n && src[i] !== q) { if (src[i] === "\\") i++; i++; }
      i++; continue;
    }
    if (c === "`") {
      out += " "; i++;
      while (i < n && src[i] !== "`") {
        if (src[i] === "\\") { i += 2; continue; }
        if (src[i] === "$" && src[i + 1] === "{") {
          out += "${"; i += 2; let depth = 1;
          while (i < n && depth > 0) {
            if (src[i] === "{") depth++;
            else if (src[i] === "}") depth--;
            out += src[i]; i++;
          }
          continue;
        }
        i++;
      }
      i++; continue;
    }
    out += c; i++;
  }
  return out;
}

const files = walk(SRC).filter((f) => !IGNORE.some((rx) => rx.test(f)));
const violations = [];

for (const file of files) {
  const raw = readFileSync(file, "utf8");
  const src = sanitize(raw);
  const rawLines = raw.split("\n");
  let depth = 0;
  const cleanLines = src.split("\n");
  for (let ln = 0; ln < cleanLines.length; ln++) {
    const cleanLine = cleanLines[ln];
    // Check depth BEFORE this line's braces apply (opening braces at line
    // start still count as depth 0 for the line's content).
    const depthAtLine = depth;
    for (const ch of cleanLine) {
      if (ch === "{") depth++;
      else if (ch === "}") depth = Math.max(0, depth - 1);
    }
    if (depthAtLine !== 0) continue;
    const m = cleanLine.match(BARE);
    if (!m) continue;
    if (GUARD.test(cleanLine)) continue;
    violations.push({ file: relative(ROOT, file), line: ln + 1, name: m[2], text: rawLines[ln].trim() });
  }
}

if (violations.length > 0) {
  console.error(`\n[check-ssr-leaks] Found ${violations.length} module-scope browser-global read(s) in src/:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  (${v.name})`);
    console.error(`    ${v.text}`);
  }
  console.error(
    `\nFix: move the read into useEffect, an event handler, <ClientOnly>, or wrap it in a\n` +
    `\`typeof window !== "undefined"\` guard. See README > "Client / Server Boundaries".`,
  );
  process.exit(1);
}

console.log(`[check-ssr-leaks] OK — scanned ${files.length} file(s) in src/, no module-scope browser-global reads.`);
