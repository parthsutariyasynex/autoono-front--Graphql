# Performance Fixes — /en/products slow load

## Root Causes Found

1. **Client-side initialization waterfall** — the product fetch was blocked behind a 4-step React render chain before it even started.
2. **`cache: "no-store"` on every Magento GraphQL call** — every page visit made a fresh network round-trip to Magento with no server-side caching.
3. **Navbar fires 5+ concurrent API calls on mount** — notifications and customer-info raced against the products fetch for the same Magento server connections.

---

## File 1 — `app/components/ProductsListing.tsx`

**What changed and why:**  
The component used a child component (`SearchParamsReader`) to read URL params and pass them back up via state. This created a 4-step init chain before the product fetch could start:
1. Mount → `SearchParamsReader` child mounts → fires its own `useEffect` → calls `handleParams`
2. `searchParams` state updates → triggers URL sync effect → sets `isInitialized = true`
3. Debounce effect fires
4. Product fetch finally runs

The fix: call `useSearchParams()` directly in the parent component (safe because the component is already inside `<Suspense>` in the page file), and lazily initialize all 8 URL-derived state values on the first render. The product fetch now starts immediately.

### Change 1 — Remove `Suspense` from React import (no longer used in this file)

```tsx
// BEFORE
import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";

// AFTER
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
```

### Change 2 — Delete the `SearchParamsReader` helper function (lines ~61–65)

Delete this entire function:

```tsx
// DELETE THIS ENTIRE FUNCTION
// Tiny wrapper to satisfy Next.js Suspense requirement for useSearchParams
function SearchParamsReader({ onParams }: { onParams: (sp: URLSearchParams) => void }) {
  const sp = useSearchParams();
  useEffect(() => { onParams(sp); }, [sp, onParams]);
  return null;
}
```

### Change 3 — Replace `searchParams` state + `handleParams` with direct `useSearchParams()` call

Find this block inside `ProductsPage` (just after the `pathStoreCode` calculation):

```tsx
// BEFORE
const [searchParams, setSearchParamsState] = useState<URLSearchParams | null>(null);
const handleParams = useCallback((sp: URLSearchParams) => setSearchParamsState(sp), []);
const { cart, addToCart } = useCart();
```

Replace with:

```tsx
// AFTER
// Direct hook call — component is inside <Suspense> in the page file so this is safe.
const rawSearchParams = useSearchParams();
const { cart, addToCart } = useCart();
```

### Change 4 — Lazily initialize all URL-derived state

Find these state declarations:

```tsx
// BEFORE
const [currentPage, setCurrentPage] = useState(1);
// ...
const [sortBy, setSortBy] = useState<string>("none");
const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});
// ...
const [searchByTerm, setSearchByTerm] = useState("");
const [itemCodeTerm, setItemCodeTerm] = useState("");
// ...
const [urlCategoryId, setUrlCategoryId] = useState<string | null>(null);
// ...
const [isInitialized, setIsInitialized] = useState(false);
// ...
const [selectedStoreCode, setSelectedStoreCode] = useState<string | null>(null);
```

Replace with:

```tsx
// AFTER
// Lazily initialize all URL-derived state so the product fetch fires on the
// very first render without waiting for a SearchParams sync effect.
const [currentPage, setCurrentPage] = useState(() => Math.max(1, Number(rawSearchParams.get("page") ?? "1") || 1));
// ...
const [sortBy, setSortBy] = useState<string>(() => rawSearchParams.get("sortBy") ?? "none");
const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>(() => {
  const { filters } = parseMagentoQueryParams(new URLSearchParams(rawSearchParams.toString()));
  return filters;
});
// ...
const [searchByTerm, setSearchByTerm] = useState(() =>
  rawSearchParams.get("searchby") || rawSearchParams.get("search") || rawSearchParams.get("searchBy") || ""
);
const [itemCodeTerm, setItemCodeTerm] = useState(() =>
  rawSearchParams.get("item_code") || rawSearchParams.get("itemCode") || ""
);
// ...
const [urlCategoryId, setUrlCategoryId] = useState<string | null>(() => rawSearchParams.get("categoryId") || null);
// ...
// DELETE the isInitialized line entirely — not needed anymore
// const [isInitialized, setIsInitialized] = useState(false);  <-- DELETE
// ...
const [selectedStoreCode, setSelectedStoreCode] = useState<string | null>(() => rawSearchParams.get("store") || null);
```

### Change 5 — Replace the big URL sync `useEffect` with two smaller ones

Find and replace the entire `useEffect(() => { ... }, [searchParams]);` block (the large one that handles both mount setup and URL sync):

```tsx
// BEFORE — one big effect on [searchParams]
useEffect(() => {
  setIsMounted(true);
  const stored = localStorage.getItem("favourites");
  if (stored) setFavIds(JSON.parse(stored));
  if (searchParams) {
    let changed = false;
    // ... all the URL sync logic ...
    setIsInitialized(true);
    // ... sessionStorage sync ...
  }
}, [searchParams]);
```

Replace the entire block with these two effects:

```tsx
// AFTER — split into mount-only setup + URL-change sync

// Mount-only: read localStorage/sessionStorage (unavailable on server).
useEffect(() => {
  setIsMounted(true);
  const stored = localStorage.getItem("favourites");
  if (stored) setFavIds(JSON.parse(stored));

  if (typeof sessionStorage !== "undefined") {
    const sc = propStoreCode || pathStoreCode || rawSearchParams.get("store") || sessionStorage.getItem("defaultStoreCode") || "";
    const sn = sessionStorage.getItem(`storeName_${sc}`);
    if (sn) setStoreName(sn);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// URL → state: sync when the URL changes after mount (e.g. browser back/forward,
// external navigation). Skipped on first mount because state was already
// lazily initialized from rawSearchParams above.
useEffect(() => {
  if (!isMounted) return;

  let changed = false;

  const cid = rawSearchParams.get("categoryId");
  if (cid && cid !== urlCategoryId) {
    setUrlCategoryId(cid);
    setCurrentPage(1);
    setProducts([]);
    changed = true;
  }

  const sc = rawSearchParams.get("store");
  if (sc !== selectedStoreCode) {
    setSelectedStoreCode(sc);
    setCurrentPage(1);
    setProducts([]);
    changed = true;
    if (sc) {
      try { localStorage.setItem("selectedStoreCode", sc); } catch { }
    } else {
      try { localStorage.removeItem("selectedStoreCode"); } catch { }
    }
  }

  const sb = rawSearchParams.get("searchby") || rawSearchParams.get("search") || rawSearchParams.get("searchBy") || "";
  if (sb !== searchByTerm) {
    setSearchByTerm(sb);
    setCurrentPage(1);
    setProducts([]);
    setSelectedFilters({});
    setSelectedFilterLabels({});
    setApiFilters(null);
    changed = true;
  }

  const ic = rawSearchParams.get("item_code") || rawSearchParams.get("itemCode") || "";
  if (ic !== itemCodeTerm) {
    setItemCodeTerm(ic);
    setCurrentPage(1);
    setProducts([]);
    setSelectedFilters({});
    setSelectedFilterLabels({});
    setApiFilters(null);
    changed = true;
  }

  const { filters, page, sortBy: parsedSortBy } = parseMagentoQueryParams(new URLSearchParams(rawSearchParams.toString()));

  if (JSON.stringify(filters) !== JSON.stringify(selectedFilters)) {
    setSelectedFilters(filters);
    setCurrentPage(1);
    changed = true;
  }
  if (page !== currentPage && !changed) {
    setCurrentPage(page);
    changed = true;
  }
  if (parsedSortBy !== sortBy) {
    setSortBy(parsedSortBy);
    changed = true;
  }

  if (changed) isSyncingFromUrl.current = true;

  if (typeof sessionStorage !== "undefined") {
    const sc2 = propStoreCode || pathStoreCode || rawSearchParams.get("store") || sessionStorage.getItem("defaultStoreCode") || "";
    const sn = sessionStorage.getItem(`storeName_${sc2}`);
    if (sn) setStoreName(sn);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [rawSearchParams, isMounted]);
```

### Change 6 — Fix the state → URL sync effect

Find:

```tsx
// BEFORE
useEffect(() => {
  if (!isMounted || !searchParams || !isInitialized) return;

  if (isSyncingFromUrl.current) { ... }

  // ... build `next` URLSearchParams ...

  next.sort();
  const current = new URLSearchParams(searchParams.toString());
  current.sort();

  if (next.toString() !== current.toString()) { ... }
}, [selectedFilters, currentPage, sortBy, searchByTerm, itemCodeTerm, isMounted, router, searchParams, isInitialized]);
```

Replace with:

```tsx
// AFTER — remove searchParams and isInitialized guards/deps, use rawSearchParams
useEffect(() => {
  if (!isMounted) return;

  if (isSyncingFromUrl.current) {
    isSyncingFromUrl.current = false;
    return;
  }

  const next = new URLSearchParams();
  if (currentPage > 1) next.set("page", String(currentPage));
  if (sortBy && sortBy !== "none") next.set("sortBy", sortBy);
  if (searchByTerm) next.set("searchby", searchByTerm);
  if (itemCodeTerm) next.set("item_code", itemCodeTerm);

  Object.entries(selectedFilters).forEach(([key, values]) => {
    if (Array.isArray(values)) {
      values.forEach((val, index) => next.append(`${key}[${index}]`, val));
    }
  });

  next.sort();
  const current = new URLSearchParams(rawSearchParams.toString());
  current.sort();

  if (next.toString() !== current.toString()) {
    const newUrl = `${window.location.pathname}${next.toString() ? `?${next.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }
}, [selectedFilters, currentPage, sortBy, searchByTerm, itemCodeTerm, isMounted, router, rawSearchParams]);
```

### Change 7 — Fix the debounced filters initialization and effect

Find:

```tsx
// BEFORE
const [debouncedFilters, setDebouncedFilters] = useState(selectedFilters);
const isFirstRender = useRef(true);
useEffect(() => {
  // On first render after init, apply filters immediately (no debounce)
  if (isFirstRender.current && isInitialized) {
    isFirstRender.current = false;
    setDebouncedFilters(selectedFilters);
    return;
  }
  const handler = setTimeout(() => setDebouncedFilters(selectedFilters), 300);
  return () => clearTimeout(handler);
}, [selectedFilters, isInitialized]);
```

Replace with:

```tsx
// AFTER — initialize from URL directly, remove isInitialized dependency
// Initialize alongside selectedFilters so both start from URL on first render.
const [debouncedFilters, setDebouncedFilters] = useState<Record<string, string[]>>(() => {
  const { filters } = parseMagentoQueryParams(new URLSearchParams(rawSearchParams.toString()));
  return filters;
});
const isFirstRender = useRef(true);
useEffect(() => {
  if (isFirstRender.current) {
    isFirstRender.current = false;
    return; // Both already initialized from URL — no debounce needed
  }
  const handler = setTimeout(() => setDebouncedFilters(selectedFilters), 300);
  return () => clearTimeout(handler);
}, [selectedFilters]);
```

### Change 8 — Remove `isInitialized` guard from the product fetch effect

Find:

```tsx
// BEFORE
useEffect(() => {
  if (!isInitialized) return;
  const abortController = new AbortController();
  // ...
}, [currentPage, debouncedFilters, sortBy, pathStoreCode, selectedStoreCode, searchByTerm, itemCodeTerm, isInitialized, retryCount]);
```

Replace with:

```tsx
// AFTER — fetch runs immediately on mount
useEffect(() => {
  const abortController = new AbortController();
  // ...
}, [currentPage, debouncedFilters, sortBy, pathStoreCode, selectedStoreCode, searchByTerm, itemCodeTerm, retryCount]);
```

### Change 9 — Remove `SearchParamsReader` from JSX

Find this in the `return (...)` block:

```tsx
// BEFORE
return (
  <>
    <Suspense fallback={null}><SearchParamsReader onParams={handleParams} /></Suspense>
    <div className="flex">
```

Replace with:

```tsx
// AFTER
return (
  <>
    <div className="flex">
```

---

## File 2 — `app/api/category-products/route.ts`

**What changed and why:**  
Every product page visit made a fresh network call to Magento GraphQL with `cache: "no-store"`. Adding `revalidate: 30` tells Next.js to cache the Magento response for 30 seconds per unique `(token + query variables)` combination. Repeat visits within that window skip the Magento round-trip entirely. Different users get separate cache entries because their auth tokens differ.

Find (around line 146):

```ts
// BEFORE
const data = await graphqlFetch<KleverCategoryProductsData>({
  query: KLEVER_CATEGORY_PRODUCTS_QUERY,
  variables: buildVariables(searchParams),
  token,
  store: storeCode,
  cache: "no-store",
});
```

Replace with:

```ts
// AFTER
const data = await graphqlFetch<KleverCategoryProductsData>({
  query: KLEVER_CATEGORY_PRODUCTS_QUERY,
  variables: buildVariables(searchParams),
  token,
  store: storeCode,
  revalidate: 30,
});
```

---

## File 3 — `app/api/kleverapi/category-products/route.ts`

Same caching fix as above, applied to the second category-products route.

Find (around line 46):

```ts
// BEFORE
const data = await graphqlFetch<KleverCategoryProductsData>({
  query: KLEVER_CATEGORY_PRODUCTS_QUERY,
  variables: {
    categoryId: Number(searchParams.get("categoryId") ?? "15"),
    pageSize: Number(searchParams.get("pageSize") ?? "20"),
    currentPage: Number(searchParams.get("currentPage") ?? "1"),
  },
  token,
  store: resolveStore(request, searchParams),
  cache: "no-store",
});
```

Replace with:

```ts
// AFTER
const data = await graphqlFetch<KleverCategoryProductsData>({
  query: KLEVER_CATEGORY_PRODUCTS_QUERY,
  variables: {
    categoryId: Number(searchParams.get("categoryId") ?? "15"),
    pageSize: Number(searchParams.get("pageSize") ?? "20"),
    currentPage: Number(searchParams.get("currentPage") ?? "1"),
  },
  token,
  store: resolveStore(request, searchParams),
  revalidate: 30,
});
```

---

## File 4 — `app/components/Navbar.tsx`

**What changed and why:**  
On every page load, the Navbar fires 5+ concurrent Magento API calls immediately on auth (notifications, customer info, source permissions, cart, menu). All of these compete with the products fetch for the same Magento server connections. Deferring non-visible calls (badge count, username) by a few hundred milliseconds lets the products fetch complete first.

### Change 1 — Defer notifications fetch by 500ms

Find:

```tsx
// BEFORE
useEffect(() => {
  if (isAuthenticated) pullNotifications();
}, [isAuthenticated, pullNotifications]);
```

Replace with:

```tsx
// AFTER
useEffect(() => {
  if (!isAuthenticated) return;
  // Defer so the products fetch (critical path) gets a head start on the
  // available Magento server connections before non-visible badge data lands.
  const id = setTimeout(() => pullNotifications(), 500);
  return () => clearTimeout(id);
}, [isAuthenticated, pullNotifications]);
```

### Change 2 — Defer customer info fetch by 300ms

Find:

```tsx
// BEFORE
useEffect(() => {
  if (isAuthenticated && !customerData) dispatch(fetchCustomerInfo() as any);
}, [isAuthenticated, customerData, dispatch]);
```

Replace with:

```tsx
// AFTER
useEffect(() => {
  if (!isAuthenticated || customerData) return;
  // Defer slightly — the username display can wait a moment while products load.
  const id = setTimeout(() => dispatch(fetchCustomerInfo() as any), 300);
  return () => clearTimeout(id);
}, [isAuthenticated, customerData, dispatch]);
```

---

## Summary of Impact

| Fix | File | What it saves |
|-----|------|---------------|
| Lazy state init + remove SearchParamsReader | `ProductsListing.tsx` | 3–4 React render cycles before the API call starts (~100–300ms) |
| Remove `isInitialized` gate | `ProductsListing.tsx` | 1 more render cycle blocked |
| `revalidate: 30` on GraphQL fetch | `category-products/route.ts` | Full Magento round-trip on repeat visits (~500ms–2s) |
| `revalidate: 30` on GraphQL fetch | `kleverapi/category-products/route.ts` | Same as above for server-side path |
| Defer notifications 500ms | `Navbar.tsx` | Frees Magento connections for products on first load |
| Defer customer info 300ms | `Navbar.tsx` | Frees Magento connections for products on first load |
