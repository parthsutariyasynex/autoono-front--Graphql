import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_ID_QUERY } from "@/src/graphql/queries";
import { REMOVE_ITEM_FROM_CART_MUTATION } from "@/src/graphql/mutations";
import type { CustomerCartIdData, RemoveItemFromCartData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const storeCode = req.headers.get("x-store-code") || null;

    const idData = await graphqlFetch<CustomerCartIdData>({
      query: CUSTOMER_CART_ID_QUERY,
      token,
      store: storeCode,
      cache: "no-store",
    });
    const cart = idData.customerCart;
    if (!cart || cart.items.length === 0) {
      return NextResponse.json({ success: true });
    }

    for (const item of cart.items) {
      try {
        await graphqlFetch<RemoveItemFromCartData>({
          query: REMOVE_ITEM_FROM_CART_MUTATION,
          variables: { cartId: cart.id, cartItemId: Number(item.id) },
          token,
          store: storeCode,
          cache: "no-store",
        });
      } catch (err) {
        console.warn(`[cart/clear] Failed to remove item ${item.id}:`, err);
      }
    }

    return NextResponse.json({ success: true });
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
