import { NextRequest, NextResponse } from "next/server";
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
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

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

// Handle cross-category text searches using a two-phase approach:
//   Phase 1 — products(search:) Elasticsearch: finds all matching products across
//             every category and returns sku + url_key.
//   Phase 2 — kleverCategoryProducts(itemCode:): enriches those SKUs with real B2B
//             data (brand, final_price, stock_label) using the existing itemCode filter.
//             item_code == sku for all products in this catalog.
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

  // Phase 1: Elasticsearch — find all matching products (cross-category)
  const searchData = await graphqlFetch<ProductsSearchData>({
    query: PRODUCTS_SEARCH_QUERY,
    variables: { search: searchQuery, pageSize, currentPage },
    token,
    store,
    revalidate: 30,
  });

  const elasticResult = searchData.products;
  if (!elasticResult || !elasticResult.items.length) {
    return NextResponse.json(emptyResponse, { status: 200, headers: cacheHeaders });
  }

  // Phase 2: Klever enrichment — get real B2B data for the matched SKUs.
  // Passes all found SKUs as comma-separated itemCode. The klever extension
  // returns actual stock_label ("Available", "Limited", etc.), B2B final_price, and brand.
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

  // Build SKU → klever product map for O(1) merge
  const kleverMap = new Map<string, KleverCategoryProductItem>();
  for (const kp of kleverData?.kleverCategoryProducts?.products ?? []) {
    kleverMap.set(kp.sku, kp);
  }

  // Merge: use Elasticsearch for total_count/pagination and url_key;
  // use klever data (brand, price, stock_label) where available.
  const products = elasticResult.items.map((ep) => {
    const kp = kleverMap.get(ep.sku);
    return {
      product_id: ep.id,
      sku: ep.sku,
      name: kp?.name ?? ep.name,
      final_price: kp?.final_price ?? null,
      image_url: kp?.image_url ?? ep.small_image?.url ?? null,
      brand: kp?.brand ?? null,
      tyre_size: kp?.tyre_size ?? null,
      is_in_stock: kp?.is_in_stock ?? null,
      stock_label: kp?.stock_label ?? null,
      stock_color: kp ? deriveStockColor(kp) : "gray",
      product_url: ep.url_key ? `/${searchLocale}/${ep.url_key}` : null,
      item_code: null,
      is_action: "Yes",
    };
  });

  return NextResponse.json(
    {
      total_count: elasticResult.total_count,
      page_size: elasticResult.page_info.page_size,
      current_page: elasticResult.page_info.current_page,
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

    // Business requirement: ALL search queries must use the base locale store so
    // they hit Magento's Elasticsearch index (which only exists on "en"/"ar").
    // Warehouse store views (V101_en, V202_en, V301_en, …) have no search index.
    //
    // This covers every search entry point:
    //   searchby / searchBy / search / searchQuery  — free-text search
    //   item_code / itemCode                        — SKU / item-code lookup
    //
    // Category browsing without any search param keeps the original store code
    // so warehouse-specific data (stock, price) is preserved where relevant.
    const isSearchRequest =
      searchParams.has("searchby") ||
      searchParams.has("searchBy") ||
      searchParams.has("search") ||
      searchParams.has("searchQuery") ||
      searchParams.has("item_code") ||
      searchParams.has("itemCode");
    const effectiveStoreCode = isSearchRequest ? toSearchStore(storeCode) : storeCode;

    // When no categoryId is in the URL, the frontend is doing a cross-category
    // text search (e.g. user typed "adnoc" with no category selected).
    // Route through Elasticsearch (products(search:)) so the search is not
    // restricted to a single category's product pool.
    const searchQuery =
      searchParams.get("searchby") ||
      searchParams.get("searchBy") ||
      searchParams.get("search") ||
      searchParams.get("searchQuery") ||
      null;
    const isElasticsearchSearch = !!searchQuery && !searchParams.has("categoryId");
    if (isElasticsearchSearch) {
      const pageSize = Number(searchParams.get("pageSize") || "20");
      const currentPage = Number(
        searchParams.get("page") || searchParams.get("currentPage") || "1",
      );
      const searchLocale = effectiveStoreCode ?? "en";
      return handleElasticsearchSearch(token, searchQuery, pageSize, currentPage, searchLocale, effectiveStoreCode);
    }

    const data = await graphqlFetch<KleverCategoryProductsData>({
      query: KLEVER_CATEGORY_PRODUCTS_QUERY,
      variables: buildVariables(searchParams),
      token,
      store: effectiveStoreCode,
      revalidate: 30,
    });

    const result = data.kleverCategoryProducts;
    const enriched = result
      ? {
          ...result,
          products: result.products.map((p) => ({
            ...p,
            stock_color: deriveStockColor(p),
          })),
        }
      : null;

    return NextResponse.json(enriched, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=120, stale-while-revalidate=600",
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
