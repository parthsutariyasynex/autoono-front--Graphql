import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_ACCOUNT_PAYMENT_SAVE_MUTATION } from "@/src/graphql/mutations";
import type { KleverPaymentHistorySaveData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

// Account-level payment for the My Payment page header "Make Payment".
// Uses KLEVER_ACCOUNT_PAYMENT_SAVE_MUTATION (no orderId) — verified against the
// live schema: kleverPaymentHistorySave.orderId is optional, only paidPayment is
// required. Kept separate from the shared order-payment POST so Order Payment is
// unaffected.
export async function POST(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const paidPayment = Number(body.paidPayment ?? body.paid_payment ?? body.amount);
    if (!Number.isFinite(paidPayment) || paidPayment <= 0) {
      return NextResponse.json({ message: "paidPayment is required" }, { status: 400 });
    }

    const rawReceivable = body.receivablePayment ?? body.receivable_payment;
    const receivablePayment =
      rawReceivable != null && Number.isFinite(Number(rawReceivable)) ? Number(rawReceivable) : null;

    const data = await graphqlFetch<KleverPaymentHistorySaveData>({
      query: KLEVER_ACCOUNT_PAYMENT_SAVE_MUTATION,
      variables: {
        paidPayment,
        paymentDate: body.paymentDate ?? body.payment_date ?? null,
        paymentMethod: body.paymentMethod ?? body.payment_method ?? null,
        remarks: body.remarks ?? null,
        companyName: body.companyName ?? body.company_name ?? null,
        receivablePayment,
      },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverPaymentHistorySave, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error creating account payment" }, { status: 500 });
  }
}
