import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import {
  CART_PAYMENT_METHODS_QUERY,
  CUSTOMER_CART_ID_QUERY,
} from "@/src/graphql/queries";
import type {
  CartPaymentMethodsData,
  CustomerCartIdData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Invalid token format" }, { status: 401 });
    }

    const store = req.headers.get("x-store-code") || getLocaleFromRequest(req);

    const { searchParams } = new URL(req.url);
    let cartId: string | null = searchParams.get("cart_id");
    if (!cartId) {
      const idData = await graphqlFetch<CustomerCartIdData>({
        query: CUSTOMER_CART_ID_QUERY,
        token,
        store,
        cache: "no-store",
      });
      cartId = idData.customerCart?.id ?? null;
    }
    if (!cartId) {
      return NextResponse.json({ message: "No active cart found" }, { status: 404 });
    }

    const data = await graphqlFetch<CartPaymentMethodsData>({
      query: CART_PAYMENT_METHODS_QUERY,
      variables: { cartId },
      token,
      store,
      cache: "no-store",
    });

    const raw = data.cart?.available_payment_methods ?? [];
    console.log("[payment-methods] store:", store, "cartId:", cartId, "raw methods:", JSON.stringify(raw));

    const methods = raw.map((m) => ({
      ...m,
      is_available: true,
    }));
    return NextResponse.json(methods, { status: 200 });
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
