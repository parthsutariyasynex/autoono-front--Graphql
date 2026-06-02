import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_CART_ID_QUERY } from "@/src/graphql/queries";
import { SET_SHIPPING_METHODS_ON_CART_MUTATION } from "@/src/graphql/mutations";
import type {
  CustomerCartIdData,
  SetShippingMethodsOnCartData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

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

    const data = await graphqlFetch<SetShippingMethodsOnCartData>({
      query: SET_SHIPPING_METHODS_ON_CART_MUTATION,
      variables: { cartId, carrierCode, methodCode },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.setShippingMethodsOnCart.cart, { status: 200 });
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
