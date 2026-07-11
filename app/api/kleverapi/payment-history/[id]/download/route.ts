import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_PAYMENT_HISTORY_RECEIPT_QUERY } from "@/src/graphql/queries";
import type { KleverPaymentHistoryReceiptData } from "@/src/graphql/types";
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

    const data = await graphqlFetch<KleverPaymentHistoryReceiptData>({
      query: KLEVER_PAYMENT_HISTORY_RECEIPT_QUERY,
      variables: { paymentId },
      token,
      cache: "no-store",
    });

    const receipt = data.kleverPaymentHistoryReceipt;
    if (!receipt?.base64) {
      return NextResponse.json(
        { message: "Receipt not available" },
        { status: 404 },
      );
    }

    const buffer = Buffer.from(receipt.base64, "base64");
    const filename = receipt.filename || `receipt_${id}.pdf`;
    const mimeType = receipt.mime_type || "application/pdf";

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error downloading receipt" }, { status: 500 });
  }
}
