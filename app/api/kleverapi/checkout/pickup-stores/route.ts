import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CHECKOUT_PICKUP_STORES_QUERY } from "@/src/graphql/queries";
import type { KleverCheckoutPickupStoresData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const store = getLocaleFromRequest(req);

    const data = await graphqlFetch<KleverCheckoutPickupStoresData>({
      query: KLEVER_CHECKOUT_PICKUP_STORES_QUERY,
      token,
      store,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverCheckoutPickupStores ?? [], { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
