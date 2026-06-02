import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_SOURCE_PERMISSIONS_QUERY } from "@/src/graphql/queries";
import type { KleverSourcePermissionsData } from "@/src/graphql/types";
import { graphqlFetch } from "@/src/lib/graphqlFetch";

const EMPTY = { permissions: [], stores: [], permitted_stores: [] };
const NO_CACHE_HEADERS = { "Cache-Control": "no-store, no-cache, must-revalidate" };

export async function GET(request: NextRequest) {
  const token = await getRequestToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await graphqlFetch<KleverSourcePermissionsData>({
      query: KLEVER_SOURCE_PERMISSIONS_QUERY,
      token,
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
    console.warn("[source-permission] GraphQL failed, serving empty:", error);
    return NextResponse.json(EMPTY, { headers: NO_CACHE_HEADERS });
  }
}
