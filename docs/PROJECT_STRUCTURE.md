# Project Structure

Reference for where code lives after the structural consolidation. The goal is
**one obvious home per concern** — no duplicate folders.

## Top-level layout

```
autoono-front/
├── app/                  # Next.js App Router — routes, pages, API routes, layout
│   ├── api/              # Route handlers (server): /api/kleverapi/*, /api/categories, ...
│   ├── <route>/          # Each folder = a route (products, cart, checkout, customer, ...)
│   ├── layout.tsx
│   └── page.tsx
├── components/           # ALL shared React components (single home)
│   ├── providers/        # Context/provider components
│   ├── skeletons/        # Loading skeletons
│   └── tyre/             # Tyre-specific UI
├── hooks/                # ALL shared React hooks (useTranslation, useLocalePath, useAction, ...)
├── lib/                  # Framework-agnostic libs & server helpers (single home)
│   ├── api/              # API client + auth helpers (auth-helper, api-client, magento-url)
│   ├── auth/             # Auth constants / session
│   ├── i18n/  locale/    # Internationalization
│   ├── services/         # Service-layer helpers
│   ├── store/            # Store-related helpers
│   ├── graphqlFetch.ts   # GraphQL fetch wrapper (was src/lib)
│   ├── cartShape.ts      # (was src/lib)
│   └── categoryProducts.ts
├── src/
│   └── graphql/          # GraphQL definitions (queries.ts, mutations.ts, types.ts)
├── modules/              # Feature modules (cart, checkout, products, notifications, types)
├── store/                # Redux (actions, reducers, constants, store.ts, hooks.ts)
├── utils/                # Small pure helpers
├── public/               # Static assets
├── docs/                 # Project documentation (this file, audits, guides)
├── scripts/              # Dev/maintenance scripts
└── middleware.ts         # i18n + store-code routing, auth guard, landing redirect
```

## Import alias

`@/*` maps to the repo root (`tsconfig.json`), so import from the canonical home:

- `@/components/<Name>`   — shared components
- `@/hooks/<name>`        — shared hooks
- `@/lib/<...>`           — libs & server helpers (incl. `@/lib/graphqlFetch`)
- `@/src/graphql/<...>`   — GraphQL queries / mutations / types
- `@/store/<...>`         — Redux
- `@/modules/<feature>/<...>` — feature-module internals

Prefer the `@/` alias over deep relative paths (`../../…`) so files stay movable.

## Consolidation history (what moved, and why)

Duplicate folders were merged into a single home:

| Was | Now | Reason |
|-----|-----|--------|
| `app/components/*` | `components/` | two component homes → one |
| `src/lib/*`        | `lib/`        | two lib roots → one |
| `lib/hooks/*`      | `hooks/`      | two hook homes → one |
| root `*.md` (audits/guides) | `docs/` | keep docs out of repo root |

`src/graphql/` was intentionally left in place — it is unique (not a duplicate),
so moving it would be churn with no dedup benefit.

## Conventions

- **One home per concern.** New shared component → `components/`; new hook → `hooks/`.
  Do not re-introduce `app/components/`, `src/lib/`, or `lib/hooks/`.
- **Feature-scoped code** (cart/checkout/products internals) lives under `modules/<feature>/`.
- **Server-only** helpers/route handlers live under `app/api/` and `lib/`.
- Keep components focused; extract when a file grows past a few hundred lines.
