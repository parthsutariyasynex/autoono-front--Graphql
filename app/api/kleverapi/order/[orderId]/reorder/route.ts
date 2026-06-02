import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_ORDER_DETAILS_QUERY } from "@/src/graphql/queries";
import { REORDER_ITEMS_MUTATION } from "@/src/graphql/mutations";
import type { KleverOrderDetailsData, ReorderItemsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { orderId } = await params;
    const id = Number(orderId);
    if (!id) {
      return NextResponse.json({ message: "Invalid order id" }, { status: 400 });
    }

    const details = await graphqlFetch<KleverOrderDetailsData>({
      query: KLEVER_ORDER_DETAILS_QUERY,
      variables: { orderId: id },
      token,
      cache: "no-store",
    });
    const orderNumber = details.kleverOrderDetails?.increment_id;
    if (!orderNumber) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    const data = await graphqlFetch<ReorderItemsData>({
      query: REORDER_ITEMS_MUTATION,
      variables: { orderNumber },
      token,
      cache: "no-store",
    });

    const errors = data.reorderItems.userInputErrors ?? [];
    return NextResponse.json(
      {
        success: errors.length === 0,
        cart_item_count: data.reorderItems.cart.total_quantity,
        errors: errors.map((e) => e.message),
      },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error during reorder" }, { status: 500 });
  }
}
