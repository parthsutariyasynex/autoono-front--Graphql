import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_QUICK_ORDER_DOWNLOAD_CSV_QUERY } from "@/src/graphql/queries";
import type { KleverQuickOrderDownloadCsvData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawCategoryId = searchParams.get("categoryId");
    const categoryId = rawCategoryId ? Number(rawCategoryId) : null;

    const data = await graphqlFetch<KleverQuickOrderDownloadCsvData>({
      query: KLEVER_QUICK_ORDER_DOWNLOAD_CSV_QUERY,
      variables: { categoryId },
      token,
      cache: "no-store",
    });

    const result = data.kleverQuickOrderDownloadCsv;
    if (!result) {
      return NextResponse.json({ error: "CSV not available" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      filename: result.file_name,
      base64: result.file_content,
      mime_type: result.content_type,
      total_products: result.total_products,
    });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
