import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_ID_QUERY } from "@/src/graphql/queries";
import {
  PLACE_ORDER_MUTATION,
  SET_PAYMENT_METHOD_ON_CART_MUTATION,
} from "@/src/graphql/mutations";
import type {
  CustomerCartIdData,
  PlaceOrderData,
  SetPaymentMethodOnCartData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const paymentMethod = body.paymentMethod ?? body.payment_method ?? body.method;

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

    if (paymentMethod) {
      await graphqlFetch<SetPaymentMethodOnCartData>({
        query: SET_PAYMENT_METHOD_ON_CART_MUTATION,
        variables: { cartId, code: paymentMethod },
        token,
        cache: "no-store",
      });
    }

    const data = await graphqlFetch<PlaceOrderData>({
      query: PLACE_ORDER_MUTATION,
      variables: { cartId },
      token,
      cache: "no-store",
    });

    const orderNumber = data.placeOrder.order.order_number;
    return NextResponse.json(
      { order_id: orderNumber, order_increment_id: orderNumber },
      { status: 200 },
    );
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
