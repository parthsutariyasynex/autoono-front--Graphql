import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import {
  KLEVER_CATEGORY_PRODUCTS_QUERY,
  PRODUCTS_SEARCH_QUERY,
} from "@/src/graphql/queries";
import type {
  KleverCategoryProductItem,
  KleverCategoryProductsData,
  ProductsSearchData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

// Server-side response cache. kleverCategoryProducts is slow on the backend
// (~10s direct, ~12-18s through the dev server). Keyed by tokenHash + store +
// variables so different users / stores / filters get their own entries.
// 60-second TTL keeps stock & price drift inside what users tolerate while
// making pagination, back-button, and rapid filter toggles feel instant.
//
// Token hashing avoids holding raw JWTs in memory while still partitioning
// the cache per user (different customer-groups have different B2B prices).
//
// Promoting to Redis would survive process restarts; for now a per-process
// Map is enough since the slow path is the backend, not memory.
const CATEGORY_CACHE_TTL_MS = 60_000;
const MAX_CATEGORY_CACHE_ENTRIES = 200;
const _categoryCache = new Map<string, { data: unknown; expires: number }>();
const _categoryInflight = new Map<string, Promise<unknown>>();

function hashToken(token: string | null): string {
  if (!token) return "anon";
  return createHash("sha1").update(token).digest("hex").slice(0, 12);
}

function buildCacheKey(
  tokenHash: string,
  storeCode: string,
  variables: Record<string, unknown>,
): string {
  // Sort keys for stable hashing — same variables in any order → same key.
  const sortedVars: Record<string, unknown> = {};
  for (const k of Object.keys(variables).sort()) sortedVars[k] = variables[k];
  return `${tokenHash}|${storeCode}|${JSON.stringify(sortedVars)}`;
}

function getCached(key: string): unknown | null {
  const entry = _categoryCache.get(key);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    _categoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: unknown): void {
  // Naive eviction: when over capacity, drop the oldest entry by insertion order.
  if (_categoryCache.size >= MAX_CATEGORY_CACHE_ENTRIES) {
    const oldest = _categoryCache.keys().next().value;
    if (oldest) _categoryCache.delete(oldest);
  }
  _categoryCache.set(key, { data, expires: Date.now() + CATEGORY_CACHE_TTL_MS });
}

// Magento's full-text search (Elasticsearch) only has indexes for base locale
// store views ("en", "ar"). Warehouse store views (V101_en, V202_en, V301_en, …)
// have no search index of their own. When a text search (searchQuery) is present
// we must send Store: "en" / "ar" so the Elasticsearch lookup works. All other
// attribute filters (itemCode, brand, width, …) work fine on warehouse store codes.
function toSearchStore(storeCode: string | null): string | null {
  if (!storeCode) return storeCode;
  const m = storeCode.match(/_(en|ar)$/i);
  return m ? m[1].toLowerCase() : storeCode;
}

// Derives the UI dot color from stock_label / is_in_stock. The GraphQL response
// from kleverCategoryProducts (minimal selection) doesn't include stock_color
// itself, so we compute it here for the frontend ProductCard.
function deriveStockColor(item: KleverCategoryProductItem): string {
  const label = (item.stock_label || "").toLowerCase().trim();
  if (label.includes("limited")) return "yellow";
  if (
    label.includes("not available") ||
    label.includes("out of stock") ||
    item.is_in_stock === false
  ) {
    return "red";
  }
  return "green";
}

// Frontend filter param → backend GraphQL variable name.
// Accepts both snake_case and camelCase from URLs; both map to the camelCase
// GraphQL variable that kleverCategoryProducts expects.
const REQUEST_PARAM_MAP: Record<string, string> = {
  parts_category: "partsCategory",
  partsCategory: "partsCategory",
  product_group: "productGroup",
  productGroup: "productGroup",
  warranty_period: "warrantyPeriod",
  warrantyPeriod: "warrantyPeriod",
  new_arrivals: "newArrivals",
  newArrivals: "newArrivals",
  oil_type: "oilType",
  oilType: "oilType",
  grade: "oilGrade",
  oilGrade: "oilGrade",
  item_code: "itemCode",
  itemCode: "itemCode",
  tyre_size: "tyreSize",
  tyreSize: "tyreSize",
  oem_marking: "oemMarking",
  oemMarking: "oemMarking",
  mgs_brand: "mgsBrand",
  mgsBrand: "mgsBrand",
  search: "searchQuery",
  searchBy: "searchQuery",
  searchby: "searchQuery",
  searchQuery: "searchQuery",
  min_price: "minPrice",
  minPrice: "minPrice",
  max_price: "maxPrice",
  maxPrice: "maxPrice",
  brand: "brand",
  color: "color",
  width: "width",
  height: "height",
  rim: "rim",
  pattern: "pattern",
  offers: "offers",
  year: "year",
  origin: "origin",
  manufacturer: "manufacturer",
  types: "types",
  runflat: "runflat",
  liters: "liters",
  sortBy: "sortBy",
  sortOrder: "sortOrder",
};

const FLOAT_ARGS = new Set(["minPrice", "maxPrice"]);
const BOOLEAN_ARGS = new Set(["newArrivals"]);

const RESERVED = new Set([
  "categoryId",
  "category_id",
  "pageSize",
  "page_size",
  "currentPage",
  "current_page",
  "page",
  "store",
  "storeCode",
  "lang",
  "category",
  "is_ajax",
  "n",
  "nocache",
]);

function buildVariables(searchParams: URLSearchParams) {
  const categoryId = Number(searchParams.get("categoryId") || "15");
  const pageSize = Number(searchParams.get("pageSize") || "20");
  const currentPage = Number(
    searchParams.get("page") || searchParams.get("currentPage") || "1",
  );

  const variables: Record<string, unknown> = { categoryId, pageSize, currentPage };

  const grouped: Record<string, string[]> = {};
  for (const [rawKey, rawValue] of searchParams) {
    if (RESERVED.has(rawKey) || rawValue === "") continue;
    const baseKey = rawKey.includes("[") ? rawKey.split("[")[0] : rawKey;
    if (!grouped[baseKey]) grouped[baseKey] = [];
    for (const part of rawValue.split(",")) {
      const v = part.trim();
      if (v && !grouped[baseKey].includes(v)) grouped[baseKey].push(v);
    }
  }

  for (const [baseKey, values] of Object.entries(grouped)) {
    const gqlArg = REQUEST_PARAM_MAP[baseKey];
    if (!gqlArg) continue;

    if (FLOAT_ARGS.has(gqlArg)) {
      const n = Number(values[0]);
      if (Number.isFinite(n)) variables[gqlArg] = n;
    } else if (BOOLEAN_ARGS.has(gqlArg)) {
      const v = values[0].toLowerCase();
      variables[gqlArg] = v === "1" || v === "true";
    } else {
      variables[gqlArg] = values.join(",");
    }
  }

  return variables;
}

// Category-scoped text search using pool + client-side substring filter.
// Klever's server-side searchQuery uses Elasticsearch n-gram indexing, which
// has a minimum token length (~3 chars) and fails for queries like "a", "ad".
// Solution: fetch the full product pool for the category/store (with any other
// active filters like brand or price preserved), then apply case-insensitive
// .includes() on the relevant product fields so any query length works.
// The store header is the full warehouse code (e.g. V101_en) so products
// are correctly scoped to the customer's store — never converted to "en"/"ar".
async function handleCategorySearch(
  token: string | null,
  variables: Record<string, unknown>,
  store: string | null,
): Promise<NextResponse> {
  const searchQuery = String(variables.searchQuery || "");
  const categoryId = Number(variables.categoryId);
  const pageSize = Number(variables.pageSize || 20);
  const currentPage = Number(variables.currentPage || 1);
  const needle = searchQuery.toLowerCase();

  // Build pool variables: preserve all active filters (brand, minPrice, width, …)
  // but remove searchQuery (applied client-side) and widen pagination to fetch
  // a large enough pool.
  const poolVars: Record<string, unknown> = { ...variables };
  delete poolVars.searchQuery;
  poolVars.pageSize = 200;
  poolVars.currentPage = 1;

  const data = await graphqlFetch<KleverCategoryProductsData>({
    query: KLEVER_CATEGORY_PRODUCTS_QUERY,
    variables: poolVars,
    token,
    store,
    revalidate: 30,
  });

  const allItems = data.kleverCategoryProducts?.products ?? [];

  // Case-insensitive partial match on every searchable text field.
  const matched = allItems.filter((p) =>
    (p.sku || "").toLowerCase().includes(needle) ||
    (p.name || "").toLowerCase().includes(needle) ||
    (p.brand || "").toLowerCase().includes(needle) ||
    (p.tyre_size || "").toLowerCase().includes(needle),
  );

  const start = (currentPage - 1) * pageSize;
  const page = matched.slice(start, start + pageSize);

  return NextResponse.json(
    {
      total_count: matched.length,
      page_size: pageSize,
      current_page: currentPage,
      total_pages: Math.ceil(matched.length / pageSize) || 0,
      products: page.map((p) => ({ ...p, stock_color: deriveStockColor(p) })),
      filters: data.kleverCategoryProducts?.filters ?? [],
    },
    { status: 200, headers: { "Cache-Control": "private, max-age=30" } },
  );
}

// Handle cross-category text searches.
// Phase 1: Elasticsearch (PRODUCTS_SEARCH_QUERY) — fast, truly cross-category,
//   uses the base-locale store code (V101_en → "en") because Elasticsearch indexes
//   only exist on base locale store views.
// Phase 2: Klever enrichment — fetch B2B data (price, stock, brand) for the SKUs
//   found by ES using the original warehouse store code for correct customer-group pricing.
async function handleElasticsearchSearch(
  token: string | null,
  searchQuery: string,
  pageSize: number,
  currentPage: number,
  searchLocale: string,
  store: string | null,
): Promise<NextResponse> {
  const emptyResponse = {
    total_count: 0,
    page_size: pageSize,
    current_page: currentPage,
    total_pages: 0,
    products: [],
    filters: [],
  };
  const cacheHeaders = { "Cache-Control": "private, max-age=120, stale-while-revalidate=600" };

  // Phase 1: Elasticsearch cross-category search.
  const searchData = await graphqlFetch<ProductsSearchData>({
    query: PRODUCTS_SEARCH_QUERY,
    variables: { search: searchQuery, pageSize, currentPage },
    token,
    store: searchLocale,
    revalidate: 30,
  });

  const elasticResult = searchData.products;
  if (!elasticResult || !elasticResult.items.length) {
    return NextResponse.json(emptyResponse, { status: 200, headers: cacheHeaders });
  }

  // Phase 2: Klever enrichment — get B2B price/stock for the matched SKUs.
  const skus = elasticResult.items.map((p) => p.sku).join(",");
  const kleverData = await graphqlFetch<KleverCategoryProductsData>({
    query: KLEVER_CATEGORY_PRODUCTS_QUERY,
    variables: {
      categoryId: 15,
      itemCode: skus,
      pageSize: elasticResult.items.length,
      currentPage: 1,
    },
    token,
    store,
    revalidate: 30,
  }).catch(() => null);

  const kleverItems = kleverData?.kleverCategoryProducts?.products ?? [];
  const kleverBySku = new Map(kleverItems.map((p) => [p.sku, p]));

  const products = elasticResult.items.map((esItem) => {
    const k = kleverBySku.get(esItem.sku);
    return {
      product_id: esItem.id,
      sku: esItem.sku,
      name: esItem.name,
      final_price: k?.final_price ?? null,
      image_url: k?.image_url ?? esItem.small_image?.url ?? null,
      brand: k?.brand ?? null,
      tyre_size: k?.tyre_size ?? null,
      is_in_stock: k?.is_in_stock ?? null,
      stock_label: k?.stock_label ?? null,
      stock_color: k ? deriveStockColor(k) : "green",
      product_url: null,
      item_code: null,
      is_action: k?.is_action ?? null,
    };
  });

  return NextResponse.json(
    {
      total_count: elasticResult.total_count,
      page_size: pageSize,
      current_page: currentPage,
      total_pages: elasticResult.page_info.total_pages,
      products,
      filters: [],
    },
    { status: 200, headers: cacheHeaders },
  );
}

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    const { searchParams } = new URL(request.url);
    const storeCode =
      searchParams.get("store") ||
      searchParams.get("storeCode") ||
      request.headers.get("x-store-code") ||
      getLocaleFromRequest(request);

    const variables = buildVariables(searchParams);

    // Warehouse store codes (V101_en, V202_en) are used for Klever requests.
    // Elasticsearch only has indexes for base locale store views ("en", "ar"),
    // so text searches use toSearchStore() to strip the warehouse prefix.
    const effectiveStoreCode = storeCode;
    const searchLocale = toSearchStore(storeCode) ?? "en";

    // When no categoryId is in the URL, the user is doing a cross-category
    // text search (e.g. typed "adnoc" with no category selected).
    // Route through Elasticsearch so the search is truly cross-category.
    const searchQuery =
      searchParams.get("searchby") ||
      searchParams.get("searchBy") ||
      searchParams.get("search") ||
      searchParams.get("searchQuery") ||
      null;
    const isCrossSearchRequest = !!searchQuery && !searchParams.has("categoryId");
    if (isCrossSearchRequest) {
      const pageSize = Number(searchParams.get("pageSize") || "20");
      const currentPage = Number(
        searchParams.get("page") || searchParams.get("currentPage") || "1",
      );
      return handleElasticsearchSearch(token, searchQuery, pageSize, currentPage, searchLocale, effectiveStoreCode);
    }

    // Category-scoped text search (categoryId present + searchQuery present).
    // Use pool + client-side substring so any query length ("a", "ad", "adnoc") works.
    // The full warehouse store code is used — no conversion to "en"/"ar".
    if (variables.searchQuery && variables.categoryId) {
      return handleCategorySearch(token, variables, effectiveStoreCode);
    }

    // Key the cache on the EFFECTIVE store so different users/stores/filters
    // stay separate.
    const cacheKey = buildCacheKey(hashToken(token), effectiveStoreCode, variables);

    // 1) Serve from cache when fresh — the typical hit path.
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=60",
          "X-Cache": "HIT",
        },
      });
    }

    // 2) Dedup concurrent identical requests — only one upstream call regardless
    //    of how many callers arrive while it's in flight.
    let inflight = _categoryInflight.get(cacheKey);
    if (!inflight) {
      inflight = (async () => {
        const data = await graphqlFetch<KleverCategoryProductsData>({
          query: KLEVER_CATEGORY_PRODUCTS_QUERY,
          variables,
          token,
          store: effectiveStoreCode,
          cache: "force-cache",
          revalidate: 30,
        });
        const result = data.kleverCategoryProducts;
        return result
          ? {
            ...result,
            products: result.products.map((p) => ({
              ...p,
              stock_color: deriveStockColor(p),
            })),
          }
          : null;
      })()
        .finally(() => { _categoryInflight.delete(cacheKey); });
      _categoryInflight.set(cacheKey, inflight);
    }

    const enriched = await inflight;

    // Only cache successful, non-null payloads. Empty/failed responses retry next time.
    if (enriched) setCached(cacheKey, enriched);

    return NextResponse.json(enriched, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Failed to load category products." }, { status: 500 });
  }
}
