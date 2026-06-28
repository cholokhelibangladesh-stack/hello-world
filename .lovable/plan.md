
# Migrate the Scout BD app to TanStack Start

The workspace was provisioned with the `tanstack_start_ts_current` template, but the current code is an older Vite + React Router SPA pasted at the project root. The dev server tries to SSR through the TanStack Start plugin and crashes because `src/server.ts`, `src/router.tsx`, and the `src/routes/` tree don't exist. This plan converts the existing app into a proper TanStack Start project so the preview loads.

## What will change

### 1. Reorganize files under `src/`
The `@/...` alias points to `./src`, but everything currently lives at the project root. Move into `src/`:

- `components/`, `hooks/`, `integrations/`, `lib/`, `pages/`, `assets/`
- `App.css`, `index.css`, `vite-env.d.ts`
- The three player JPGs at the root (into `src/assets/`)

Delete the old `App.tsx` and `main.tsx` — TanStack Start uses its own entry points.

### 2. Add TanStack Start scaffolding
Create the required entry files:

- `src/server.ts` — TanStack Start server handler
- `src/router.tsx` — `createRouter` with `QueryClient` in context
- `src/routes/__root.tsx` — root layout: providers (QueryClient, Theme, Auth, Tooltip, Sonner Toaster), `<Navbar />`, `<Outlet />`, `<Footer />`, `<MobileBottomNav />`, and the one-time `LoadingIntro` gated by `sessionStorage` inside a `useEffect`
- `src/routes/$.tsx` — catch-all → renders existing `NotFound`

### 3. Convert each page to a file-based route
One route file per current React Router path, each wrapping the existing page component with `createFileRoute(...)({ component })` and a route-specific `head()` for title/description/OG metadata:

```
src/routes/index.tsx                 → /
src/routes/auth.tsx                  → /auth
src/routes/reset-password.tsx        → /reset-password
src/routes/safe-scouting.tsx         → /safe-scouting
src/routes/mission.tsx               → /mission
src/routes/faq.tsx                   → /faq
src/routes/resume.$userId.tsx        → /resume/:userId
src/routes/admin.tsx                 → /admin           (admin-gated)
src/routes/player.tsx                → /player          (player-gated)
src/routes/player.upload.tsx         → /player/upload
src/routes/player.explore.tsx        → /player/explore
src/routes/player.profile.tsx        → /player/profile
src/routes/scout.tsx                 → /scout           (scout-gated)
src/routes/scout.explore.tsx         → /scout/explore
src/routes/scout.selections.tsx      → /scout/selections
src/routes/scout.profile.tsx         → /scout/profile
```

Role gating stays in the existing `ProtectedRoute` component used inside each guarded route's component body — no router-level `beforeLoad` rewrite, keeping the change minimal.

### 4. Replace `react-router-dom` with `@tanstack/react-router`
Across `components/Navbar.tsx`, `MobileBottomNav.tsx`, `NavLink.tsx`, `ProtectedRoute.tsx`, `Footer.tsx`, `NotificationBell.tsx`, `PlayerVideosTab.tsx`, `ProfileTab.tsx`, `ScoutSelectPlayer.tsx`, `hooks/useAuth.tsx`, and every page that imports from `react-router-dom`:

- `Link`, `NavLink`, `useNavigate`, `useLocation`, `useParams`, `Navigate` → `@tanstack/react-router` equivalents
- `navigate("/x")` → `navigate({ to: "/x" })`
- Dynamic params via `<Link to="/resume/$userId" params={{ userId }}>`
- Remove `react-router-dom` from `package.json`

### 5. Vite config + dependencies
- Rewrite `vite.config.ts` to wrap with `@lovable.dev/vite-tanstack-config` (already in `node_modules`) so the TanStack Router + Start plugins are configured correctly.
- Add to `package.json`: `@tanstack/react-router`, `@tanstack/react-start`, `@lovable.dev/vite-tanstack-config`, matching `vite` 7/8 (the versions already installed in `node_modules`).
- Remove `react-router-dom` and `lovable-tagger` (not used by the TanStack template).

### 6. Page-route SSR safety
The pages use `useAuth` which calls `supabase.auth.getSession()` — fine on the client, fine on the server (no `window` access at module scope). `App.tsx`'s `sessionStorage` read for `LoadingIntro` is moved into a `useEffect` inside the root component so it doesn't run during SSR.

No route loaders are added in this pass — pages keep fetching client-side as they do today. That can be migrated to TanStack Query loaders incrementally later.

## What will NOT change

- Visual design, styling, Tailwind config, component logic
- Supabase integration, auth flow, role checks
- Page content or business logic
- The `LoadingIntro` cinematic and its session-once behavior

## Risk / things to watch

- TanStack Start SSR runs route components on the server. Any component that touches `window`, `document`, or `localStorage` at module top-level or during the first render will need a `useEffect` or `ClientOnly` wrapper. I'll audit the moved components for this in the same pass.
- The intro screen currently blocks the router from mounting (`showIntro ? <LoadingIntro/> : <BrowserRouter>...`). Under TanStack Start the router must always mount; the intro becomes a full-screen overlay rendered alongside `<Outlet />` inside `__root.tsx` and is dismissed by the same `sessionStorage` flag.
- After the migration the dev server should boot cleanly and the homepage should render. I'll verify with a `curl` to `localhost:8080` and report back.
