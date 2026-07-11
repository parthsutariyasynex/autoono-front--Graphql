import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { CUSTOMER_CART_ID_QUERY } from "@/src/graphql/queries";
import { SET_SHIPPING_METHODS_ON_CART_MUTATION } from "@/src/graphql/mutations";
import type {
  CustomerCartIdData,
  SetShippingMethodsOnCartData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

    const store = req.headers.get("x-store-code") || getLocaleFromRequest(req);

    console.log("[shipping-method] POST store:", store, "carrier:", carrierCode, "method:", methodCode);

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
      if (cartId && cartData && cartData.items.length === 0) {
        console.warn("[shipping-method] Cart is empty — refusing to set shipping method");
        return NextResponse.json(
          { message: "Your cart is empty. Please add items before checkout." },
          { status: 400 },
        );
      }
    }
    if (!cartId) {
      return NextResponse.json({ message: "No active cart found" }, { status: 404 });
    }

    console.log("[shipping-method] cartId:", cartId);

    const data = await graphqlFetch<SetShippingMethodsOnCartData>({
      query: SET_SHIPPING_METHODS_ON_CART_MUTATION,
      variables: { cartId, carrierCode, methodCode },
      token,
      store,
      cache: "no-store",
    });

    console.log("[shipping-method] Magento response OK, selected method:", carrierCode, methodCode);

    return NextResponse.json(data.setShippingMethodsOnCart.cart, { status: 200 });
  } catch (error) {
    console.error("[shipping-method] POST error:", error);
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message },
        // Magento GraphQL errors arrive at HTTP 200 with errors[]; map them to 422.
        { status: error.status >= 400 ? error.status : 422 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
