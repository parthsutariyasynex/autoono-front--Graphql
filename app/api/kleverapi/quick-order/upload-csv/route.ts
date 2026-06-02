import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_QUICK_ORDER_UPLOAD_CSV_MUTATION } from "@/src/graphql/mutations";
import type { KleverQuickOrderUploadCsvData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

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

    const data = await graphqlFetch<KleverQuickOrderUploadCsvData>({
      query: KLEVER_QUICK_ORDER_UPLOAD_CSV_MUTATION,
      variables: { fileContent },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverQuickOrderUploadCsv);
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
