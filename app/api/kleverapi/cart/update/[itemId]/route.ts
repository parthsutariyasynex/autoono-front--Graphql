import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_ID_QUERY, CUSTOMER_CART_QUERY } from "@/src/graphql/queries";
import { UPDATE_CART_ITEMS_MUTATION } from "@/src/graphql/mutations";
import type {
  CustomerCartData,
  CustomerCartIdData,
  UpdateCartItemsData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";
import { reshapeCustomerCart } from "@/src/lib/cartShape";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { itemId } = await params;
    const body = await req.json();
    const qty = Number(body.qty);
    const cartItemId = Number(itemId);
    if (!cartItemId || !Number.isFinite(qty)) {
      return NextResponse.json({ message: "Invalid itemId or qty" }, { status: 400 });
    }

    let cartId: string | null = body.cart_id ?? null;
    if (!cartId) {
      const idData = await graphqlFetch<CustomerCartIdData>({
        query: CUSTOMER_CART_ID_QUERY,
        token,
        cache: "no-store",
      });
      cartId = idData.customerCart?.id ?? null;
    }
    if (!cartId) {
      return NextResponse.json({ message: "No cart available" }, { status: 404 });
    }

    await graphqlFetch<UpdateCartItemsData>({
      query: UPDATE_CART_ITEMS_MUTATION,
      variables: { cartId, items: [{ cart_item_id: cartItemId, quantity: qty }] },
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
