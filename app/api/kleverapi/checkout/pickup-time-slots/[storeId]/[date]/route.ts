import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CHECKOUT_PICKUP_TIME_SLOTS_QUERY } from "@/src/graphql/queries";
import type { KleverCheckoutPickupTimeSlotsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string; date: string }> },
) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { storeId, date } = await params;
    const storeIdNum = Number(storeId);
    if (!storeIdNum || !date) {
      return NextResponse.json({ message: "Invalid storeId or date" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverCheckoutPickupTimeSlotsData>({
      query: KLEVER_CHECKOUT_PICKUP_TIME_SLOTS_QUERY,
      variables: { storeId: storeIdNum, date },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverCheckoutPickupTimeSlots ?? [], { status: 200 });
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
