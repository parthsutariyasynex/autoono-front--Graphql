import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CHECKOUT_SHIPPING_EXTRAS_QUERY } from "@/src/graphql/queries";
import { KLEVER_CHECKOUT_SET_SHIPPING_EXTRAS_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverCheckoutSetShippingExtrasData,
  KleverCheckoutShippingExtrasData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Invalid token format" }, { status: 401 });
    }
    const data = await graphqlFetch<KleverCheckoutShippingExtrasData>({
      query: KLEVER_CHECKOUT_SHIPPING_EXTRAS_QUERY,
      token,
      cache: "no-store",
    });
    return NextResponse.json(data.kleverCheckoutShippingExtras ?? {}, { status: 200 });
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

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Invalid token format" }, { status: 401 });
    }
    const body = await req.json();
    const variables: Record<string, unknown> = {
      deliveryDate: body.deliveryDate ?? body.delivery_date ?? null,
      deliveryComment: body.deliveryComment ?? body.delivery_comment ?? null,
      pickupStore: body.pickupStore ?? body.pickup_store ?? null,
      pickupDate: body.pickupDate ?? body.pickup_date ?? null,
      pickupTime: body.pickupTime ?? body.pickup_time ?? null,
      pickupPersonName: body.pickupPersonName ?? body.pickup_person_name ?? null,
      pickupMobileNumber: body.pickupMobileNumber ?? body.pickup_mobile_number ?? null,
      fee: typeof body.fee === "number" ? body.fee : null,
    };

    const data = await graphqlFetch<KleverCheckoutSetShippingExtrasData>({
      query: KLEVER_CHECKOUT_SET_SHIPPING_EXTRAS_MUTATION,
      variables,
      token,
      cache: "no-store",
    });
    return NextResponse.json(
      { success: data.kleverCheckoutSetShippingExtras !== false },
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
