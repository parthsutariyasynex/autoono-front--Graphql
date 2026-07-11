import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_PAYMENT_HISTORY_BY_ID_QUERY } from "@/src/graphql/queries";
import { KLEVER_PAYMENT_HISTORY_EDIT_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverPaymentHistoryByIdData,
  KleverPaymentHistoryEditData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const paymentId = Number(id);
    if (!paymentId) {
      return NextResponse.json({ message: "Invalid payment id" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverPaymentHistoryByIdData>({
      query: KLEVER_PAYMENT_HISTORY_BY_ID_QUERY,
      variables: { paymentId },
      token,
      cache: "no-store",
    });

    if (!data.kleverPaymentHistoryById) {
      return NextResponse.json({ message: "Payment not found" }, { status: 404 });
    }
    return NextResponse.json(data.kleverPaymentHistoryById, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error fetching payment details" }, { status: 500 });
  }
}

async function editHandler(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const paymentId = Number(id);
    if (!paymentId) {
      return NextResponse.json({ message: "Invalid payment id" }, { status: 400 });
    }
    const body = await request.json();
    const paidPayment =
      body.paidPayment !== undefined || body.paid_payment !== undefined
        ? Number(body.paidPayment ?? body.paid_payment)
        : null;

    const data = await graphqlFetch<KleverPaymentHistoryEditData>({
      query: KLEVER_PAYMENT_HISTORY_EDIT_MUTATION,
      variables: {
        paymentId,
        paidPayment,
        remarks: body.remarks ?? null,
      },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverPaymentHistoryEdit, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error updating payment record" }, { status: 500 });
  }
}

export const POST = editHandler;
export const PUT = editHandler;
