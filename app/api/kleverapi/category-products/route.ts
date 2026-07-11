import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CATEGORY_PRODUCTS_QUERY } from "@/src/graphql/queries";
import type {
  KleverCategoryProductItem,
  KleverCategoryProductsData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

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

function resolveStore(request: NextRequest, searchParams: URLSearchParams): string {
  return (
    searchParams.get("store") ||
    searchParams.get("storeCode") ||
    request.headers.get("store") ||
    request.headers.get("x-store-code") ||
    getLocaleFromRequest(request)
  );
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  try {
    const token = await getRequestToken(request);

    const data = await graphqlFetch<KleverCategoryProductsData>({
      query: KLEVER_CATEGORY_PRODUCTS_QUERY,
      variables: {
        categoryId: Number(searchParams.get("categoryId") ?? "15"),
        pageSize: Number(searchParams.get("pageSize") ?? "20"),
        currentPage: Number(searchParams.get("currentPage") ?? "1"),
      },
      token,
      store: resolveStore(request, searchParams),
      cache: "force-cache",
      revalidate: 30,
    });

    const result = data.kleverCategoryProducts;
    const items = (result?.products ?? []).map((p) => ({
      ...p,
      stock_color: deriveStockColor(p),
    }));
    return NextResponse.json(
      {
        items,
        total_count: result?.total_count ?? 0,
        page_info: {
          current_page: result?.current_page ?? 1,
          page_size: result?.page_size ?? 20,
          total_pages: result?.total_pages ?? 0,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json(
      { message: "Failed to load category products." },
      { status: 500 },
    );
  }
}
