import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_ID_QUERY, CUSTOMER_CART_QUERY } from "@/src/graphql/queries";
import { REMOVE_ITEM_FROM_CART_MUTATION } from "@/src/graphql/mutations";
import type {
  CustomerCartData,
  CustomerCartIdData,
  RemoveItemFromCartData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";
import { reshapeCustomerCart } from "@/src/lib/cartShape";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;
    const cartItemId = Number(itemId);
    if (!cartItemId) {
      return NextResponse.json({ message: "Invalid itemId" }, { status: 400 });
    }

    const idData = await graphqlFetch<CustomerCartIdData>({
      query: CUSTOMER_CART_ID_QUERY,
      token,
      cache: "no-store",
    });
    const cartId = idData.customerCart?.id;
    if (!cartId) {
      return NextResponse.json({ success: true });
    }

    // Guard against Magento's `getSku() on bool` resolver bug — it fires when
    // cart_item_id doesn't exist in the cart (already removed, race condition,
    // stale page, etc.). Pre-check membership so we return a clean idempotent
    // 200 instead of propagating a 500 to the client.
    const presentIds = (idData.customerCart?.items ?? []).map((i) => Number(i.id));
    if (!presentIds.includes(cartItemId)) {
      const cartData = await graphqlFetch<CustomerCartData>({
        query: CUSTOMER_CART_QUERY,
        token,
        cache: "no-store",
      });
      if (!cartData.customerCart) return NextResponse.json({ success: true });
      return NextResponse.json(reshapeCustomerCart(cartData.customerCart));
    }

    await graphqlFetch<RemoveItemFromCartData>({
      query: REMOVE_ITEM_FROM_CART_MUTATION,
      variables: { cartId, cartItemId },
      token,
      cache: "no-store",
    });

    const cartData = await graphqlFetch<CustomerCartData>({
      query: CUSTOMER_CART_QUERY,
      token,
      cache: "no-store",
    });
    if (!cartData.customerCart) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json(reshapeCustomerCart(cartData.customerCart));
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
