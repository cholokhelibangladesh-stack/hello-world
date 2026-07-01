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

/**
 * Packages that touch the DOM, `window`, or other browser-only APIs at
 * import time (or on first construction from module scope). Importing
 * these statically from a file that gets included in the SSR bundle
 * crashes the Worker at request time. Use a dynamic `await import()`
 * inside a client-only handler (event handler, useEffect, etc.) instead.
 */
const BROWSER_ONLY_LIBS = [
  "html2canvas",
  "jspdf",
  "jspdf-autotable",
  "html-to-image",
  "dom-to-image",
  "dom-to-image-more",
  "canvas-confetti",
  "quill",
  "react-quill",
  "tinymce",
  "@tinymce/tinymce-react",
  "codemirror",
  "monaco-editor",
  "@monaco-editor/react",
  "chart.js",
  "swiper",
  "leaflet",
  "mapbox-gl",
  "hls.js",
  "video.js",
];
const IMPORT_RX = new RegExp(
  `^\\s*(?:import\\b[^;]*?from\\s*|import\\s*\\(\\s*|require\\s*\\(\\s*)` +
    `["']((?:${BROWSER_ONLY_LIBS.map((n) => n.replace(/[/\\-]/g, "\\$&")).join("|")}))(?:/[^"']*)?["']`,
);

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
    const imp = cleanLine.match(IMPORT_RX);
    if (imp) {
      // A dynamic `await import("jspdf")` inside a function is fine — those
      // land at depth > 0 and never reach here. Anything at depth 0 is a
      // static top-level import that ships to the SSR bundle.
      // Skip pure type-only imports: `import type ... from "pkg"`.
      if (!/^\s*import\s+type\b/.test(cleanLine)) {
        violations.push({
          file: relative(ROOT, file),
          line: ln + 1,
          name: imp[1],
          kind: "lib",
          text: rawLines[ln].trim(),
        });
        continue;
      }
    }
    const m = cleanLine.match(BARE);
    if (!m) continue;
    if (GUARD.test(cleanLine)) continue;
    violations.push({ file: relative(ROOT, file), line: ln + 1, name: m[2], kind: "global", text: rawLines[ln].trim() });
  }
}

if (violations.length > 0) {
  const globals = violations.filter((v) => v.kind === "global");
  const libs = violations.filter((v) => v.kind === "lib");
  console.error(`\n[check-ssr-leaks] Found ${violations.length} SSR leak(s) in src/:\n`);
  if (globals.length) {
    console.error(`  Module-scope browser-global reads (${globals.length}):`);
    for (const v of globals) {
      console.error(`    ${v.file}:${v.line}  (${v.name})`);
      console.error(`      ${v.text}`);
    }
  }
  if (libs.length) {
    console.error(`  Module-scope browser-only library imports (${libs.length}):`);
    for (const v of libs) {
      console.error(`    ${v.file}:${v.line}  (${v.name})`);
      console.error(`      ${v.text}`);
    }
  }
  console.error(
    `\nFix globals: move the read into useEffect, an event handler, <ClientOnly>, or a\n` +
    `\`typeof window !== "undefined"\` guard.\n` +
    `Fix libs: replace the static import with a dynamic \`await import("<pkg>")\` inside\n` +
    `a client-only handler (event handler / useEffect). See README > "Client / Server Boundaries".`,
  );
  process.exit(1);
}

console.log(`[check-ssr-leaks] OK — scanned ${files.length} file(s) in src/, no module-scope browser-global reads.`);
