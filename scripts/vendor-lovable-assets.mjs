#!/usr/bin/env node
// Copies images/videos that Lovable hosts at /__l5e/assets-v1/... into public/lovable-assets/
// and points each src/assets/*.asset.json at the local copy.
//
// Why: /__l5e/ paths only exist on Lovable's hosting. The Android/iOS app (and any
// other host) would show a broken logo and images without this.
//
// Usage:  node scripts/vendor-lovable-assets.mjs            (downloads from LOVABLE_SITE_URL)
//         node scripts/vendor-lovable-assets.mjs --check    (exit 1 if anything still points at /__l5e/)
// Safe to re-run; already-vendored assets are skipped. Commit the results.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SITE = (process.env.LOVABLE_SITE_URL || "https://cholokheli.lovable.app").replace(/\/+$/, "");
const ASSET_DIR = path.join(ROOT, "src/assets");
const OUT_DIR = path.join(ROOT, "public/lovable-assets");
const checkOnly = process.argv.includes("--check");

const files = fs.readdirSync(ASSET_DIR).filter((f) => f.endsWith(".asset.json"));
const pending = files
  .map((f) => ({ file: path.join(ASSET_DIR, f), meta: JSON.parse(fs.readFileSync(path.join(ASSET_DIR, f), "utf8")) }))
  .filter(({ meta }) => typeof meta.url === "string" && meta.url.startsWith("/__l5e/"));

if (checkOnly) {
  if (pending.length) {
    console.error(`${pending.length} asset(s) still point at Lovable hosting. Run: node scripts/vendor-lovable-assets.mjs`);
    process.exit(1);
  }
  console.log(`All ${files.length} assets are vendored.`);
  process.exit(0);
}

let failed = 0;
for (const { file, meta } of pending) {
  const name = (meta.original_filename || path.basename(meta.url)).replace(/[^A-Za-z0-9._-]/g, "_");
  const rel = `/lovable-assets/${meta.asset_id}/${name}`;
  const dest = path.join(ROOT, "public", rel);
  try {
    const res = await fetch(SITE + meta.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (meta.size && Math.abs(buf.length - meta.size) > 16) throw new Error(`size ${buf.length} != expected ${meta.size}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    fs.writeFileSync(file, JSON.stringify({ ...meta, url: rel, vendored_from: meta.url }, null, 2) + "\n");
    console.log(`ok   ${name} (${buf.length} bytes)`);
  } catch (e) {
    failed++;
    console.error(`FAIL ${name}: ${e.message}`);
  }
}
console.log(`${pending.length - failed}/${pending.length} downloaded into ${path.relative(ROOT, OUT_DIR)}/`);
process.exit(failed ? 1 : 0);
