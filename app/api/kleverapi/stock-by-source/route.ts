import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { GET_PRODUCT_STOCK_BY_SOURCE } from "@/src/graphql/queries";
import type { KleverProductStockBySourceData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    const { searchParams } = new URL(request.url);
    const sku = searchParams.get("sku");

    if (!sku) {
      return NextResponse.json({ message: "SKU parameter is required." }, { status: 400 });
    }

    const data = await graphqlFetch<KleverProductStockBySourceData>({
      query: GET_PRODUCT_STOCK_BY_SOURCE,
      variables: { sku },
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      cache: "no-store",
    });

    return NextResponse.json(data.kleverProductStockBySource ?? {}, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Failed to fetch product stock by source." }, { status: 500 });
  }
}
