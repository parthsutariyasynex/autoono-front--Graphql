import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_PAYMENT_HISTORY_PAYMENT_METHODS_QUERY } from "@/src/graphql/queries";
import type { KleverPaymentHistoryPaymentMethodsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const storeCode = request.headers.get("x-store-code") ?? undefined;

    const data = await graphqlFetch<KleverPaymentHistoryPaymentMethodsData>({
      query: KLEVER_PAYMENT_HISTORY_PAYMENT_METHODS_QUERY,
      token,
      ...(storeCode ? { storeCode } : {}),
      cache: "no-store",
    });

    return NextResponse.json(
      { items: data.kleverPaymentHistoryPaymentMethods ?? [] },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      // Propagate auth failures so the client knows the session is invalid
      if (error.status === 401 || error.status === 403) {
        return NextResponse.json({ message: error.message }, { status: error.status });
      }
      // Schema not implemented or other GraphQL error — degrade gracefully
      return NextResponse.json({ items: [] }, { status: 200 });
    }
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
