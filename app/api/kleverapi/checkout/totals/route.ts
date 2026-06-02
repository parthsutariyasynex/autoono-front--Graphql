import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CHECKOUT_TOTALS_QUERY } from "@/src/graphql/queries";
import type { KleverCheckoutTotalsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized: Missing customer token" }, { status: 401 });
    }

    const data = await graphqlFetch<KleverCheckoutTotalsData>({
      query: KLEVER_CHECKOUT_TOTALS_QUERY,
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverCheckoutTotals ?? {}, { status: 200 });
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
