import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_QUICK_ORDER_REMOVE_ITEM_MUTATION } from "@/src/graphql/mutations";
import type { KleverQuickOrderRemoveItemData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sku: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { sku } = await params;
    const decoded = decodeURIComponent(sku);
    if (!decoded) {
      return NextResponse.json({ error: "sku is required" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverQuickOrderRemoveItemData>({
      query: KLEVER_QUICK_ORDER_REMOVE_ITEM_MUTATION,
      variables: { sku: decoded },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverQuickOrderRemoveItem);
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
