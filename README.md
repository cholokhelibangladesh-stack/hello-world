# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Client / Server Boundaries (SSR rules)

This project is a **TanStack Start** app that server-renders on Cloudflare
Workers. Every file under `src/` is isomorphic by default — it runs on the
server during SSR and on the client during navigation. Break the rules
below and requests return HTTP 500 the moment a page is rendered.

### The `"use client"` rule

**Do not add `"use client"` to any file in this repo.** TanStack Start is
not a React Server Components framework; the directive has no meaning
here and Rollup will emit a warning ("Module level directives cause
errors when bundled"). Client / server separation is enforced by
**boundary APIs**, not by a top-of-file string.

Third-party packages that ship their own `"use client"` (`@radix-ui/*`,
`@tanstack/react-router`, `sonner`, `next-themes`, etc.) are safe — the
ignored-directive warning during bundling is expected and can be
disregarded.

### Server-only code

Anything that touches secrets, environment variables, service-role keys,
the filesystem, or privileged APIs MUST live behind a real boundary:

| API | Use for |
| --- | --- |
| `createServerFn().handler()` | RPC-style reads/writes called from components |
| `createServerOnlyFn()` | Server utility helpers |
| `*.server.ts(x)` module | Server-only helpers (blocked from client bundles) |
| `src/routes/api/**` | Raw HTTP endpoints (webhooks, cron, public APIs) |

Reading `process.env.X` at module scope of a shared file is a bug —
values may be `undefined` at request time on Workers. Read them **inside
the handler body**.

### Client-only code

Browser globals — `window`, `document`, `localStorage`,
`sessionStorage`, `navigator` — do not exist during SSR. They may only
be touched from:

- inside a `useEffect` callback
- inside an event handler (`onClick`, `onSubmit`, ...)
- inside a `<ClientOnly>` render tree
- behind a `typeof window !== "undefined"` guard, when the value is
  read at call time (not at module load time)

Module-scope reads such as `const origin = window.location.origin;`
at the top of a file are forbidden and will fail CI.

### Browser-only npm packages

Some libraries touch `window` / `document` at import time and cannot be
loaded during SSR (`html2canvas`, `jspdf`, `jspdf-autotable`,
`html-to-image`, `dom-to-image*`, `canvas-confetti`, `quill` /
`react-quill`, `tinymce`, `codemirror`, `monaco-editor`, `chart.js`,
`swiper`, `leaflet`, `mapbox-gl`, `hls.js`, `video.js`, ...).

Never import them statically at the top of a file. Load them dynamically
inside the handler that actually needs them:

```ts
const downloadPdf = async () => {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  // ...
};
```

Type-only imports (`import type { jsPDF } from "jspdf"`) are allowed —
they are erased at build time.

### Automated enforcement

Two scripts back these rules and run in CI (`.github/workflows/ssr-check.yml`):

```sh
# Scans src/ for module-scope browser-global reads AND module-scope
# imports of known browser-only libraries.
node scripts/check-ssr-leaks.mjs

# Runs the scan, then the production build, then verifies the SSR
# entry (dist/server/index.mjs) exists. Fails the pipeline on any
# missing-export error or server-bundle failure.
bun run check:ssr
```

Run `bun run check:ssr` locally before opening a PR that changes
component logic, routing, or dependencies.

