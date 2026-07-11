import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import {
  KLEVER_SEARCH_POOL_QUERY,
  KLEVER_CATEGORY_PRODUCTS_QUERY,
} from "@/src/graphql/queries";
import type {
  KleverSearchPoolData,
  KleverCategoryProductsData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

// Two consumers share this endpoint:
//   1. SearchPopup typeahead — reads only name + sku. Pass `light=1` to use
//      Klever's server-side searchQuery filter with client-side substring check.
//      Supports any query length including short keywords like "ad" or "adn".
//   2. ProductsListing item-code search — needs full B2B data (brand, image,
//      stock, price). Default path uses kleverCategoryProducts with a 200-row
//      pool + client-side substring filter.

// Root category used when no categoryId is in the URL (same default ProductsListing uses).
// Override with MAGENTO_DEFAULT_CATEGORY_ID env var if the root category ever changes.
const DEFAULT_CATEGORY_ID = Number(process.env.MAGENTO_DEFAULT_CATEGORY_ID || "15");
const SEARCH_POOL_SIZE = 200;

// Substring matcher — compares query against all key product fields using
// case-insensitive .includes() so partial matches always work regardless of
// query length or Elasticsearch n-gram configuration.
function matchesSubstring(
  p: { sku?: string | null; name?: string | null; brand?: string | null; item_code?: string | null; tyre_size?: string | null; pattern?: string | null },
  needle: string,
): boolean {
  return (
    (p.sku || "").toLowerCase().includes(needle) ||
    (p.name || "").toLowerCase().includes(needle) ||
    (p.brand || "").toLowerCase().includes(needle) ||
    (p.item_code || "").toLowerCase().includes(needle) ||
    (p.tyre_size || "").toLowerCase().includes(needle) ||
    (p.pattern || "").toLowerCase().includes(needle)
  );
}

// Light mode (typeahead): search within the active category when categoryId is
// known (Klever category-scoped query + client-side substring), or fall back
// to Elasticsearch for global cross-category search when no category is active.
async function handleLight(
  token: string,
  query: string,
  pageSize: number,
  currentPage: number,
  storeCode: string | undefined,
  categoryId: number | null,
) {
  const needle = query.toLowerCase();

  if (categoryId) {
    // Fetch the full category pool WITHOUT searchQuery so Klever's n-gram server-side
    // filter doesn't discard products before we can inspect them.
    // Klever's searchQuery uses Elasticsearch n-gram indexing which drops short queries
    // ("a", "ad") entirely and under-counts longer ones ("adnoc" → 4 when 9 exist).
    // Fetching 200 products and filtering client-side with .includes() guarantees any
    // query length and any substring position is matched correctly.
    // Full warehouse store code (V101_en, V202_en) is used — never converted to en/ar.
    const data = await graphqlFetch<KleverCategoryProductsData>({
      query: KLEVER_CATEGORY_PRODUCTS_QUERY,
      variables: {
        categoryId,
        pageSize: 200,
        currentPage: 1,
      },
      token,
      store: storeCode ?? null,
      cache: "no-store",
    });

    const allItems = data.kleverCategoryProducts?.products ?? [];
    const matched = allItems.filter((p) => matchesSubstring(p, needle));
    const page = matched.slice(0, pageSize);

    return {
      total_count: matched.length,
      page_info: {
        current_page: 1,
        page_size: pageSize,
        total_pages: Math.max(1, Math.ceil(matched.length / pageSize)),
      },
      items: page.map((p) => ({
        product_id: p.product_id,
        id: p.product_id,
        sku: p.sku,
        name: p.name,
        url_key: null,
        image_url: p.image_url ?? null,
      })),
    };
  }

  // No categoryId in URL — use the root category pool with client-side substring
  // so short queries ("a", "ad") work the same as on specific category pages.
  // This mirrors what ProductsListing does when no category is explicitly selected:
  // it also defaults to DEFAULT_CATEGORY_ID for its API calls.
  const data = await graphqlFetch<KleverCategoryProductsData>({
    query: KLEVER_CATEGORY_PRODUCTS_QUERY,
    variables: {
      categoryId: DEFAULT_CATEGORY_ID,
      pageSize: 200,
      currentPage: 1,
    },
    token,
    store: storeCode ?? null,
    cache: "no-store",
  });

  const allItems = data.kleverCategoryProducts?.products ?? [];
  const matched = allItems.filter((p) => matchesSubstring(p, needle));
  const page = matched.slice(0, pageSize);

  return {
    total_count: matched.length,
    page_info: {
      current_page: 1,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(matched.length / pageSize)),
    },
    items: page.map((p) => ({
      product_id: p.product_id,
      id: p.product_id,
      sku: p.sku,
      name: p.name,
      url_key: null,
      image_url: p.image_url ?? null,
    })),
  };
}

async function handleFull(
  token: string,
  query: string,
  categoryId: number,
  pageSize: number,
  currentPage: number,
  storeCode: string | undefined,
) {
  const data = await graphqlFetch<KleverSearchPoolData>({
    query: KLEVER_SEARCH_POOL_QUERY,
    variables: { categoryId, pageSize: SEARCH_POOL_SIZE, currentPage: 1 },
    token,
    store: storeCode ?? null,
    cache: "no-store",
  });
  const pool = data.kleverCategoryProducts?.products ?? [];
  const needle = query.toLowerCase();
  const matched = pool.filter((p) => matchesSubstring(p, needle));
  const start = Math.max(0, (currentPage - 1) * pageSize);
  return {
    total_count: matched.length,
    page_info: {
      current_page: currentPage,
      page_size: pageSize,
      total_pages: Math.max(1, Math.ceil(matched.length / pageSize)),
    },
    items: matched.slice(start, start + pageSize),
  };
}

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("query") ?? searchParams.get("search") ?? "").trim();
    // Read categoryId from query params. null means no active category → global search.
    const rawCategoryId = searchParams.get("categoryId");
    const categoryId = rawCategoryId ? Number(rawCategoryId) : null;
    const fullCategoryId = categoryId ?? DEFAULT_CATEGORY_ID;
    const pageSize = Number(searchParams.get("pageSize") ?? "10");
    const currentPage = Number(
      searchParams.get("currentPage") ?? searchParams.get("page") ?? "1",
    );
    const light = searchParams.get("light") === "1";

    if (!query) {
      return NextResponse.json({ message: "query is required" }, { status: 400 });
    }

    const storeCode =
      searchParams.get("store") ||
      searchParams.get("storeCode") ||
      request.headers.get("x-store-code") ||
      undefined;

    const result = light
      ? await handleLight(token, query, pageSize, currentPage, storeCode, categoryId)
      : await handleFull(token, query, fullCategoryId, pageSize, currentPage, storeCode);

    return NextResponse.json(result);
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { message: "Server error searching products" },
      { status: 500 },
    );
  }
}
