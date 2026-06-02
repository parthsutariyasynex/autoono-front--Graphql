import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import {
  KLEVER_SEARCH_POOL_QUERY,
  PRODUCTS_SEARCH_QUERY,
} from "@/src/graphql/queries";
import type {
  KleverSearchPoolData,
  ProductsSearchData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

// Two consumers share this endpoint:
//   1. SearchPopup typeahead — reads only name + sku. Pass `light=1` to use
//      stock `products(search:)` which is server-side full-text and fast
//      (~1.8s on the demo backend).
//   2. ProductsListing item-code search — needs full B2B data (brand, image,
//      stock, price). Default path uses kleverCategoryProducts with a 200-row
//      pool + client-side substring filter (~30s — limited by backend).

const DEFAULT_CATEGORY_ID = Number(process.env.MAGENTO_DEFAULT_CATEGORY_ID || "5");
const SEARCH_POOL_SIZE = 200;

async function handleLight(
  token: string,
  query: string,
  pageSize: number,
  currentPage: number,
  storeCode: string | undefined,
) {
  const data = await graphqlFetch<ProductsSearchData>({
    query: PRODUCTS_SEARCH_QUERY,
    variables: { search: query, pageSize, currentPage },
    token,
    store: storeCode ?? null,
    cache: "no-store",
  });
  const result = data.products;
  return {
    total_count: result?.total_count ?? 0,
    page_info: result?.page_info ?? {
      current_page: currentPage,
      page_size: pageSize,
      total_pages: 0,
    },
    items: (result?.items ?? []).map((p) => ({
      product_id: p.id,
      id: p.id,
      sku: p.sku,
      name: p.name,
      url_key: p.url_key,
      image_url: p.small_image?.url ?? null,
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
  const matched = pool.filter((p) => {
    const sku = (p.sku || "").toLowerCase();
    const name = (p.name || "").toLowerCase();
    const itemCode = (p.item_code || "").toLowerCase();
    return sku.includes(needle) || name.includes(needle) || itemCode.includes(needle);
  });
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

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get("query") ?? searchParams.get("search") ?? "").trim();
    const categoryId = Number(searchParams.get("categoryId") || DEFAULT_CATEGORY_ID);
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
      ? await handleLight(token, query, pageSize, currentPage, storeCode)
      : await handleFull(token, query, categoryId, pageSize, currentPage, storeCode);

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
