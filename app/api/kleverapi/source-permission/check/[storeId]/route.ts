import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_SOURCE_PERMISSION_CHECK_QUERY } from "@/src/graphql/queries";
import type { KleverSourcePermissionCheckData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { storeId } = await params;
    const id = Number(storeId);
    if (!id) {
      return NextResponse.json({ error: "Invalid store id" }, { status: 400 });
    }

    const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);

    const data = await graphqlFetch<KleverSourcePermissionCheckData>({
      query: KLEVER_SOURCE_PERMISSION_CHECK_QUERY,
      variables: { storeId: id },
      token,
      store,
      cache: "no-store",
    });

    // Safe default: deny access when Magento returns null for this storeId
    return NextResponse.json(data.kleverSourcePermissionCheck ?? { allowed: false }, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { error: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Failed to check permission" }, { status: 500 });
  }
}
