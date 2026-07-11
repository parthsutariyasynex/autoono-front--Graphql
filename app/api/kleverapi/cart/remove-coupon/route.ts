import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_ID_QUERY, CUSTOMER_CART_QUERY } from "@/src/graphql/queries";
import { REMOVE_COUPON_FROM_CART_MUTATION } from "@/src/graphql/mutations";
import type {
  CustomerCartData,
  CustomerCartIdData,
  RemoveCouponFromCartData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";
import { reshapeCustomerCart } from "@/lib/cartShape";

async function handle(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const storeCode = req.headers.get("x-store-code") || null;

    let cartId: string | null = null;
    try {
      const body = await req.json();
      cartId = body.cart_id ?? null;
    } catch {
      // no body — fine
    }

    if (!cartId) {
      const idData = await graphqlFetch<CustomerCartIdData>({
        query: CUSTOMER_CART_ID_QUERY,
        token,
        store: storeCode,
        cache: "no-store",
      });
      cartId = idData.customerCart?.id ?? null;
    }
    if (!cartId) {
      return NextResponse.json({ message: "No active cart found" }, { status: 404 });
    }

    await graphqlFetch<RemoveCouponFromCartData>({
      query: REMOVE_COUPON_FROM_CART_MUTATION,
      variables: { cartId },
      token,
      store: storeCode,
      cache: "no-store",
    });

    const cartData = await graphqlFetch<CustomerCartData>({
      query: CUSTOMER_CART_QUERY,
      token,
      store: storeCode,
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
        { status: error.status >= 400 ? error.status : 400 },
      );
    }
    return NextResponse.json({ message: "Failed to remove coupon" }, { status: 500 });
  }
}

export const POST = handle;
export const DELETE = handle;
