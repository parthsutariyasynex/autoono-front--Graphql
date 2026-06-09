import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { KLEVER_MY_STATEMENT_QUERY } from "@/src/graphql/queries";
import type { KleverMyStatementData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

function resolveStatementError(raw: string): string {
  if (/not defined in company code/i.test(raw)) {
    return "Your account is not configured for statements. Please contact your account manager.";
  }
  if (/unauthorized|unauthenticated/i.test(raw)) {
    return "Your session has expired. Please log in and try again.";
  }
  if (/no such entity|not found/i.test(raw)) {
    return "No statement found for the selected criteria.";
  }
  return raw;
}

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate") || "2025-01-01";
    const toDate = searchParams.get("toDate") || "2026-03-16";
    const statementType =
      searchParams.get("statementType") || searchParams.get("type") || "account_statement";
    const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);

    const data = await graphqlFetch<KleverMyStatementData>({
      query: KLEVER_MY_STATEMENT_QUERY,
      variables: { fromDate, toDate, statementType },
      token,
      store,
      cache: "no-store",
    });

    const pdfUrl = data.kleverMyStatement?.pdf_url;
    if (!pdfUrl) {
      return NextResponse.json(
        { message: "No statement available for the selected date range and type." },
        { status: 404 },
      );
    }

    const pdfResponse = await fetch(pdfUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (pdfResponse.ok) {
      const buffer = await pdfResponse.arrayBuffer();
      return new Response(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="statement_${fromDate}_${toDate}.pdf"`,
        },
      });
    }
    // PDF URL returned by Magento but server could not fetch it — stream failed
    return NextResponse.json(
      { message: "Statement could not be downloaded. Please try again." },
      { status: 502 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      // "Customer X is not defined in company code Y" — Magento/Klever config error.
      // Show a friendly message instead of exposing internal customer/company codes.
      const friendlyMessage = resolveStatementError(error.message);
      return NextResponse.json(
        { message: friendlyMessage, errors: error.errors },
        { status: error.status >= 400 ? error.status : 422 },
      );
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
