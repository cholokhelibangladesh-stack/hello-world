#!/usr/bin/env node
/**
 * SSR build verification.
 *
 * 1. Runs `bun run lint` — the flat ESLint config includes a
 *    `no-restricted-syntax` rule that blocks module-scope reads of
 *    window / document / localStorage / sessionStorage / navigator in
 *    `src/**`. This is the authoritative check for SSR-leak-prone code.
 * 2. Runs `bun run build` (production).
 * 3. Confirms the SSR bundle emitted `dist/server/index.mjs`.
 *
 * Fails the pipeline with a non-zero exit code if any step fails.
 * Fine-grained "did this specific browser call sneak in?" checks are done
 * at the source level (step 1), not by regex-scanning the bundled output —
 * bundled chunks legitimately reference `window` inside effects/handlers,
 * which is safe.
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

run("Lint (SSR-leak guard)", "bun", ["run", "lint"]);
run("Production build", "bun", ["run", "build"]);

const entry = join(ROOT, "dist", "server", "index.mjs");
if (!existsSync(entry)) {
  console.error(`[check-ssr-build] Missing ${entry} — SSR bundle did not emit.`);
  process.exit(1);
}

console.log("\n[check-ssr-build] OK — lint clean, production build succeeded, SSR entry present.");
