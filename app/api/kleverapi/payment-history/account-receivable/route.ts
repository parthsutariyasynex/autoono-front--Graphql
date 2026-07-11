import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_PAYMENT_HISTORY_ACCOUNT_RECEIVABLE_QUERY } from "@/src/graphql/queries";
import type { KleverPaymentHistoryAccountReceivableData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await graphqlFetch<KleverPaymentHistoryAccountReceivableData>({
      query: KLEVER_PAYMENT_HISTORY_ACCOUNT_RECEIVABLE_QUERY,
      token,
      cache: "no-store",
    });

    return NextResponse.json(
      data.kleverPaymentHistoryAccountReceivable ?? {
        success: false,
        message: "No data",
        total_order_amount: null,
        total_paid: null,
        receivable_payment: null,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { message: "Server error fetching account receivable" },
      { status: 500 },
    );
  }
}
