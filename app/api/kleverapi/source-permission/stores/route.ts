import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_SOURCE_AVAILABLE_STORES_QUERY } from "@/src/graphql/queries";
import type { KleverSourceAvailableStoresData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);

    const data = await graphqlFetch<KleverSourceAvailableStoresData>({
      query: KLEVER_SOURCE_AVAILABLE_STORES_QUERY,
      token,
      store,
      cache: "no-store",
    });

    const stores = data.kleverSourceAvailableStores ?? [];
    console.log("[source-permission/stores] count:", stores.length, "store:", store);
    return NextResponse.json(stores, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { error: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}
