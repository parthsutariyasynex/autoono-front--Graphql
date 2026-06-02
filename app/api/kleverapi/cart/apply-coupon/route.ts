import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_ID_QUERY, CUSTOMER_CART_QUERY } from "@/src/graphql/queries";
import { APPLY_COUPON_TO_CART_MUTATION } from "@/src/graphql/mutations";
import type {
  ApplyCouponToCartData,
  CustomerCartData,
  CustomerCartIdData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";
import { reshapeCustomerCart } from "@/src/lib/cartShape";

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const couponCode = String(body.couponCode ?? body.coupon_code ?? body.code ?? "").trim();
    if (!couponCode) {
      return NextResponse.json({ message: "couponCode is required" }, { status: 400 });
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
      return NextResponse.json({ message: "No active cart found" }, { status: 404 });
    }

    await graphqlFetch<ApplyCouponToCartData>({
      query: APPLY_COUPON_TO_CART_MUTATION,
      variables: { cartId, couponCode },
      token,
      cache: "no-store",
    });

    const cartData = await graphqlFetch<CustomerCartData>({
      query: CUSTOMER_CART_QUERY,
      token,
      cache: "no-store",
    });
    if (!cartData.customerCart) {
      return NextResponse.json({ success: true, coupon: couponCode });
    }
    return NextResponse.json(reshapeCustomerCart(cartData.customerCart));
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 400 },
      );
    }
    return NextResponse.json({ message: "Failed to apply coupon" }, { status: 500 });
  }
}
