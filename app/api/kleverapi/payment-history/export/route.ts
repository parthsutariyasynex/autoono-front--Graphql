import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_PAYMENT_HISTORY_EXPORT_CSV_QUERY } from "@/src/graphql/queries";
import type { KleverPaymentHistoryExportCsvData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get("paymentStatus") ?? searchParams.get("payment_status") ?? null;
    const paymentMethod = searchParams.get("paymentMethod") ?? searchParams.get("payment_method") ?? null;
    const paymentFor = searchParams.get("paymentFor") ?? searchParams.get("payment_for") ?? null;
    const fromDate = searchParams.get("fromDate") ?? searchParams.get("from_date") ?? null;
    const toDate = searchParams.get("toDate") ?? searchParams.get("to_date") ?? null;

    const data = await graphqlFetch<KleverPaymentHistoryExportCsvData>({
      query: KLEVER_PAYMENT_HISTORY_EXPORT_CSV_QUERY,
      variables: { paymentStatus, paymentMethod, paymentFor, fromDate, toDate },
      token,
      cache: "no-store",
    });

    const file = data.kleverPaymentHistoryExportCsv;
    if (!file?.base64) {
      return NextResponse.json({ message: "Export not available" }, { status: 404 });
    }

    const buffer = Buffer.from(file.base64, "base64");
    const filename = file.filename || `payment_history_export.csv`;
    const mimeType = file.mime_type || "text/csv";

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
    return NextResponse.json({ message: "Server error exporting payment history" }, { status: 500 });
  }
}
