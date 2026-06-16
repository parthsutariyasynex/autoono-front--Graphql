import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import {
  CART_SHIPPING_METHODS_QUERY,
  CUSTOMER_CART_ID_QUERY,
} from "@/src/graphql/queries";
import { SET_SHIPPING_METHODS_ON_CART_MUTATION } from "@/src/graphql/mutations";
import type {
  CartShippingMethodsData,
  CustomerCartIdData,
  SetShippingMethodsOnCartData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

async function resolveCartId(
  token: string,
  store: string | null,
  fallback: string | null,
): Promise<string | null> {
  if (fallback) return fallback;
  const idData = await graphqlFetch<CustomerCartIdData>({
    query: CUSTOMER_CART_ID_QUERY,
    token,
    store,
    cache: "no-store",
  });
  return idData.customerCart?.id ?? null;
}

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Invalid token format" }, { status: 401 });
    }
    const store = getLocaleFromRequest(req);
    const { searchParams } = new URL(req.url);
    const cartId = await resolveCartId(token, store, searchParams.get("cart_id"));
    if (!cartId) {
      return NextResponse.json({ message: "No active cart found" }, { status: 404 });
    }

    const data = await graphqlFetch<CartShippingMethodsData>({
      query: CART_SHIPPING_METHODS_QUERY,
      variables: { cartId },
      token,
      store,
      cache: "no-store",
    });

    const methods =
      data.cart?.shipping_addresses?.flatMap((a) => a.available_shipping_methods ?? []) ?? [];
    return NextResponse.json(methods, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status >= 400 ? error.status : 422 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Invalid token format" }, { status: 401 });
    }

    const body = await req.json();
    const carrierCode = body.carrierCode ?? body.carrier_code;
    const methodCode = body.methodCode ?? body.method_code;
    if (!carrierCode || !methodCode) {
      return NextResponse.json(
        { message: "carrierCode and methodCode are required" },
        { status: 400 },
      );
    }

    const store = getLocaleFromRequest(req);

    // Resolve cartId and validate cart is not empty before calling the mutation.
    // Magento rejects setShippingMethodsOnCart with a 422 if total_quantity === 0.
    let cartId: string | null = body.cart_id ?? null;
    if (!cartId) {
      const idData = await graphqlFetch<CustomerCartIdData>({
        query: CUSTOMER_CART_ID_QUERY,
        token,
        store,
        cache: "no-store",
      });
      const cartData = idData.customerCart;
      cartId = cartData?.id ?? null;
      if (cartId && cartData && (cartData.total_quantity === 0 || cartData.items.length === 0)) {
        console.warn("[shipping-methods/POST] Cart is empty — refusing to set shipping method");
        return NextResponse.json(
          { message: "Your cart is empty. Please add items before checkout." },
          { status: 400 },
        );
      }
    }
    if (!cartId) {
      return NextResponse.json({ message: "No active cart found" }, { status: 404 });
    }

    const data = await graphqlFetch<SetShippingMethodsOnCartData>({
      query: SET_SHIPPING_METHODS_ON_CART_MUTATION,
      variables: { cartId, carrierCode, methodCode },
      token,
      store,
      cache: "no-store",
    });

    return NextResponse.json(data.setShippingMethodsOnCart.cart, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status >= 400 ? error.status : 422 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
