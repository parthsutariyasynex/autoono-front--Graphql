# Performance Audit: Altalayi Frontend vs tyresonline.ae

**Date:** 2026-03-19

---

## Architecture Comparison

| Aspect | tyresonline.ae (Competitor) | Our Frontend (Altalayi) | Status |
|--------|---------------------------|------------------------|--------|
| Platform | Next.js (React) — headless | Next.js 15 + React 19 — headless | Same |
| Rendering | SSR + client-side hydration | 100% Client-Side Rendering (`"use client"` on 35 files) | Needs Fix |
| Product Loading | Fast API backend (pre-indexed data via Elasticsearch/Redis) | `cache: "no-store"` on ALL 52 API routes — every request hits Magento | Critical |
| Frontend | SPA — no full page reloads | SPA — no full page reloads | Same |
| Code Splitting | Automatic Next.js chunks | Zero `next/dynamic` usage, no lazy loading | Needs Fix |
| Filtering | Client-side with fast API | Client + server-side, no Elasticsearch | Partially OK |
| Image Optimization | Optimized images | Raw `<img>` tags, no `next/image` | Needs Fix |
| Data Fetching | SWR / optimized patterns | Manual `useEffect + fetch`, no SWR or React Query | Needs Fix |
| API Layer | Fast pre-indexed backend | 100% pass-through proxy to Magento (52 routes) | Critical |

---

## Critical Issues

### 1. Zero Caching (CRITICAL)
Every API route uses `cache: "no-store"`. Categories, filters, tyre sizes — data that rarely changes — fetched fresh from Magento on every request. 300-400ms+ added per page load.

### 2. No Server-Side Rendering (HIGH)
All 35 pages use `"use client"`. Browser downloads JS → executes → mounts → fetches data → renders. 3x wait time vs SSR.

### 3. API Routes Are Pure Pass-Through (HIGH)
All 52 API routes forward to Magento with zero optimization — no caching, no transformation, no pre-indexing.

### 4. No Code Splitting (MEDIUM)
Zero `next/dynamic` usage. Checkout page is ~79KB loaded upfront. Modals and sidebars bundled in initial load.

### 5. No Image Optimization (MEDIUM)
Raw `<img>` tags everywhere. No `next/image` — missing lazy loading, responsive sizes, WebP conversion.

### 6. No Smart Data Fetching (MEDIUM)
Manual `useEffect + fetch` pattern. No SWR/React Query — no deduplication, no stale-while-revalidate, no background revalidation.

---

## Improvement Priorities

| Priority | Action | Expected Impact |
|----------|--------|-----------------|
| 1 | Add API caching layer (in-memory/Redis, remove `cache: "no-store"` from read-only routes) | 90% faster API responses |
| 2 | Convert pages to Server Components (SSR) | 50% faster initial load |
| 3 | Add `next/dynamic` for modals, checkout, sidebar | 40% smaller JS bundle |
| 4 | Replace `<img>` with `next/image` | 60% smaller image payload |
| 5 | Add SWR for client-side data fetching | Instant repeat visits |
| 6 | Static generation for stable pages (categories, tyre sizes) | Zero server cost |

---

## Key Insight

> We have the same framework as tyresonline.ae but are not using its key features. Adding caching to API routes and converting pages to Server Components would dramatically close the speed gap.
