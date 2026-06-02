import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CATEGORY_PRODUCTS_QUERY } from "@/src/graphql/queries";
import type {
  KleverCategoryProductItem,
  KleverCategoryProductsData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

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

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    const { searchParams } = new URL(request.url);
    const storeCode =
      searchParams.get("store") ||
      searchParams.get("storeCode") ||
      request.headers.get("x-store-code") ||
      getLocaleFromRequest(request);

    const data = await graphqlFetch<KleverCategoryProductsData>({
      query: KLEVER_CATEGORY_PRODUCTS_QUERY,
      variables: buildVariables(searchParams),
      token,
      store: storeCode,
      cache: "no-store",
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
