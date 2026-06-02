import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_SOURCE_AVAILABLE_STORES_QUERY } from "@/src/graphql/queries";
import type { KleverSourceAvailableStoresData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await graphqlFetch<KleverSourceAvailableStoresData>({
      query: KLEVER_SOURCE_AVAILABLE_STORES_QUERY,
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverSourceAvailableStores ?? [], {
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
