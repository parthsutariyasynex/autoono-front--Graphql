import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_QUICK_ORDER_UPLOAD_CSV_MUTATION } from "@/src/graphql/mutations";
import type { KleverQuickOrderUploadCsvData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function POST(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const fileContent = body.fileContent ?? body.file_content ?? body.base64;
    if (!fileContent) {
      return NextResponse.json({ message: "No file content provided" }, { status: 400 });
    }

    // ── SERVER DEBUG: decode and inspect what the route actually received ────────
    // These logs appear in the Next.js server terminal (not the browser).
    // They let us verify the base64 survives the HTTP round-trip intact and
    // confirm whether BOM / delimiter / trailing-space issues originate here
    // or were already present in what the browser sent.
    const decoded = Buffer.from(fileContent, "base64").toString("utf-8");
    const routeHasBOM = decoded.charCodeAt(0) === 0xFEFF;
    const cleanedForInspection = routeHasBOM ? decoded.slice(1) : decoded;
    const firstLine = cleanedForInspection.split(/\r?\n/).find((l) => l.trim()) ?? "";
    const routeCommas = (firstLine.match(/,/g) ?? []).length;
    const routeTabs   = (firstLine.match(/\t/g) ?? []).length;
    const routeSemis  = (firstLine.match(/;/g)  ?? []).length;
    const routeDelim  = routeTabs > routeCommas && routeTabs > routeSemis ? "TAB"
                      : routeSemis > routeCommas                          ? "SEMICOLON"
                      : "COMMA";
    // First 5 rows after splitting on detected delimiter
    const routeLines = cleanedForInspection.split(/\r?\n/).filter((l) => l.trim());
    const routeDelimChar = routeDelim === "TAB" ? "\t" : routeDelim === "SEMICOLON" ? ";" : ",";
    const routeParsedRows = routeLines.slice(0, 5).map((line) =>
      line.split(routeDelimChar).map((c) => c.trim())
    );
    console.log("[route:upload-csv] fileContent length (base64):", fileContent.length);
    console.log("[route:upload-csv] decoded length (chars):", decoded.length);
    console.log("[route:upload-csv] BOM present:", routeHasBOM);
    console.log("[route:upload-csv] delimiter detected:", routeDelim,
      "| commas:", routeCommas, "| tabs:", routeTabs, "| semicolons:", routeSemis);
    console.log("[route:upload-csv] first 5 parsed rows:", routeParsedRows);
    console.log("[route:upload-csv] raw first 400 chars:", JSON.stringify(decoded.substring(0, 400)));
    // ── END SERVER DEBUG ──────────────────────────────────────────────────────────

    const data = await graphqlFetch<KleverQuickOrderUploadCsvData>({
      query: KLEVER_QUICK_ORDER_UPLOAD_CSV_MUTATION,
      variables: { fileContent },
      token,
      cache: "no-store",
    });

    // Log what Magento returned so we can cross-reference with what we sent
    const returnedItems = data.kleverQuickOrderUploadCsv?.items ?? [];
    console.log("[route:upload-csv] Magento returned items count:", returnedItems.length);
    console.log("[route:upload-csv] Magento first 5 items:", returnedItems.slice(0, 5).map((item) => ({
      sku:           item.sku,
      is_valid:      item.is_valid,
      error_message: item.error_message,
      price:         item.price,
      qty:           item.qty,
    })));

    return NextResponse.json(data.kleverQuickOrderUploadCsv);
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      console.error("[route:upload-csv] GraphQL error:", error.message, error.errors);
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    console.error("[route:upload-csv] unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
