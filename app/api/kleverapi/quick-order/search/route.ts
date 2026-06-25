import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_QUICK_ORDER_SEARCH_QUERY } from "@/src/graphql/queries";
import type { KleverQuickOrderSearchData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") ?? "";
    const pageSize = Number(searchParams.get("pageSize") || "10");

    if (!query || query.length < 2) {
      return NextResponse.json({ items: [], total_count: 0 });
    }

    const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);

    const data = await graphqlFetch<KleverQuickOrderSearchData>({
      query: KLEVER_QUICK_ORDER_SEARCH_QUERY,
      variables: { query, pageSize },
      token,
      store,
      cache: "no-store",
    });

    return NextResponse.json(
      data.kleverQuickOrderSearch ?? { items: [], total_count: 0 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
