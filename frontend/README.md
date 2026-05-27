# Frontend — Cycling Training Planner

React 19 + Vite + TypeScript + Tailwind CSS v4, themed with Vercel's Geist tokens
(see `../vercel_DESIGN.md`).

## Run

```bash
pnpm install
pnpm dev         # http://localhost:5173
pnpm typecheck   # tsc -b --noEmit
pnpm build       # tsc + vite build → dist/
pnpm lint        # eslint
```

The dev server proxies `/api/*` to `http://127.0.0.1:8000` (the FastAPI backend) — see
`vite.config.ts`.

## Layout

```
src/
  components/
    ui/                 atoms: Button, Card, Badge, Input, Label, PageHeader
    AppShell.tsx        layout (Nav + <Outlet />)
    Nav.tsx
    AuthGuard.tsx       redirects anonymous → /login
    LanguageSwitcher.tsx
  hooks/
    useAuth.tsx         Supabase session context
  lib/
    cn.ts               clsx wrapper
    supabase.ts         Supabase browser client
    api.ts              fetch wrapper that adds Bearer <jwt>
    queryClient.ts      TanStack Query client (with sensible retry policy)
    i18n.ts             i18next init (FR + EN, persisted to localStorage)
  locales/
    en.json
    fr.json
  pages/
    LoginPage.tsx       functional — email/password + Google OAuth via Supabase
    DashboardPage.tsx   placeholder (step 8)
    CalendarPage.tsx    placeholder (step 5)
    RoutePlannerPage.tsx placeholder (step 6)
    SettingsPage.tsx    placeholder (step 3)
  App.tsx               router (BrowserRouter)
  main.tsx              providers (QueryClient, Auth, i18n init, fonts)
  index.css             Tailwind v4 @import + @theme tokens (Geist)
```

## Design tokens

All design tokens live in `src/index.css` under `@theme`. They map directly to the spec
in `../vercel_DESIGN.md`:

- **Type**: `font-sans` → Geist Variable, `font-mono` → Geist Mono Variable.
- **Tracking**: `tracking-display` (-0.05em), `tracking-section` (-0.04em),
  `tracking-card` (-0.04em), `tracking-snug` (-0.02em).
- **Color**: `bg-foreground`, `text-gray-{50,100,400,500,600,900}`, and the workflow
  accents `text-develop` / `text-preview` / `text-ship` (use only in workflow context).
- **Shadow**: `shadow-[var(--shadow-border)]` (the signature shadow-as-border),
  `shadow-[var(--shadow-card)]`, `shadow-[var(--shadow-card-lift)]`.
- **Radius**: 6px for buttons, 8px for cards, 12px for image cards, 9999px for pill
  badges. Never use the pill radius on a primary action button.
