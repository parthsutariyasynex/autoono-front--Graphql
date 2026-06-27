import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_SOURCE_PERMISSIONS_QUERY } from "@/src/graphql/queries";
import type { KleverSourcePermissionsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

const EMPTY = { has_restrictions: null, total_count: 0, permitted_store_ids: [], permitted_stores: [] };
const NO_CACHE_HEADERS = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(request: NextRequest) {
  const token = await getRequestToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);

  try {
    const data = await graphqlFetch<KleverSourcePermissionsData>({
      query: KLEVER_SOURCE_PERMISSIONS_QUERY,
      token,
      store,
      cache: "no-store",
    });

    const result = data.kleverSourcePermissions;
    if (!result) {
      return NextResponse.json(EMPTY, { headers: NO_CACHE_HEADERS });
    }

    return NextResponse.json(
      {
        has_restrictions: result.has_restrictions,
        total_count: result.total_count,
        permitted_store_ids: result.permitted_store_ids,
        permitted_stores: result.permitted_stores,
      },
      { headers: NO_CACHE_HEADERS },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      console.error("[source-permission] GraphQL error:", error.status, error.message);
    } else {
      console.error("[source-permission] Unexpected error:", error);
    }
    return NextResponse.json(EMPTY, { headers: NO_CACHE_HEADERS });
  }
}
