import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_CHECKOUT_TOTALS_QUERY } from "@/src/graphql/queries";
import type { KleverCheckoutTotalsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Missing customer token" }, { status: 401 });
    }

    const store = req.headers.get("x-store-code") || getLocaleFromRequest(req);

    const data = await graphqlFetch<KleverCheckoutTotalsData>({
      query: KLEVER_CHECKOUT_TOTALS_QUERY,
      token,
      store,
      cache: "no-store",
    });

    const totals = data.kleverCheckoutTotals;
    console.log("[checkout/totals] store:", store, "raw kleverCheckoutTotals:", JSON.stringify(totals));

    return NextResponse.json(totals ?? {}, { status: 200 });
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
