import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_MY_STATEMENT_QUERY } from "@/src/graphql/queries";
import type { KleverMyStatementData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: Request) {
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

    const data = await graphqlFetch<KleverMyStatementData>({
      query: KLEVER_MY_STATEMENT_QUERY,
      variables: { fromDate, toDate, statementType },
      token,
      cache: "no-store",
    });

    const pdfUrl = data.kleverMyStatement?.pdf_url;
    if (!pdfUrl) {
      return NextResponse.json(data.kleverMyStatement ?? {}, { status: 200 });
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
    return NextResponse.json({ pdf_url: pdfUrl }, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
