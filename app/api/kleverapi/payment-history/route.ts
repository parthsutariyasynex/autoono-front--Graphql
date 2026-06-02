import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_PAYMENT_HISTORY_QUERY } from "@/src/graphql/queries";
import { KLEVER_PAYMENT_HISTORY_SAVE_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverPaymentHistoryData,
  KleverPaymentHistorySaveData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawOrderId = searchParams.get("orderId") ?? searchParams.get("order_id");
    const orderId = rawOrderId ? Number(rawOrderId) : null;
    const paymentStatus = searchParams.get("paymentStatus") ?? searchParams.get("payment_status");
    const paymentMethod = searchParams.get("paymentMethod") ?? searchParams.get("payment_method");
    const pageSize = Number(searchParams.get("pageSize") || "20");
    const currentPage = Number(searchParams.get("currentPage") || "1");

    const data = await graphqlFetch<KleverPaymentHistoryData>({
      query: KLEVER_PAYMENT_HISTORY_QUERY,
      variables: { orderId, paymentStatus, paymentMethod, pageSize, currentPage },
      token,
      cache: "no-store",
    });

    return NextResponse.json(
      data.kleverPaymentHistory ?? { items: [], total_count: 0 },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error fetching payment history" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const orderId = Number(body.orderId ?? body.order_id);
    const paidPayment = Number(body.paidPayment ?? body.paid_payment ?? body.amount);
    if (!orderId || !Number.isFinite(paidPayment)) {
      return NextResponse.json(
        { message: "orderId and paidPayment are required" },
        { status: 400 },
      );
    }

    const data = await graphqlFetch<KleverPaymentHistorySaveData>({
      query: KLEVER_PAYMENT_HISTORY_SAVE_MUTATION,
      variables: {
        orderId,
        paidPayment,
        paymentDate: body.paymentDate ?? body.payment_date ?? null,
        paymentMethod: body.paymentMethod ?? body.payment_method ?? null,
        sapInvoiceNo: body.sapInvoiceNo ?? body.sap_invoice_no ?? null,
        remarks: body.remarks ?? null,
        comment1: body.comment1 ?? null,
        comment2: body.comment2 ?? null,
        signedDocBase64: body.signedDocBase64 ?? body.signed_doc_base64 ?? null,
        signedDocName: body.signedDocName ?? body.signed_doc_name ?? null,
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
    return NextResponse.json({ message: "Server error creating payment record" }, { status: 500 });
  }
}
