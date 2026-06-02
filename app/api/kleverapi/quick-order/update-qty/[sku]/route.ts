import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_QUICK_ORDER_UPDATE_ITEM_QTY_MUTATION } from "@/src/graphql/mutations";
import type { KleverQuickOrderUpdateItemQtyData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function PUT(
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
    const body = await request.json();
    const qty = Number(body.qty ?? body.quantity);
    if (!decoded || !Number.isFinite(qty)) {
      return NextResponse.json({ error: "sku + qty required" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverQuickOrderUpdateItemQtyData>({
      query: KLEVER_QUICK_ORDER_UPDATE_ITEM_QTY_MUTATION,
      variables: { sku: decoded, qty },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverQuickOrderUpdateItemQty);
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
