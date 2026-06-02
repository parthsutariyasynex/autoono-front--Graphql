import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_ORDER_UPLOAD_FILTER_OPTIONS_QUERY } from "@/src/graphql/queries";
import type { KleverOrderUploadFilterOptionsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(request: Request) {
  const isDev = process.env.NODE_ENV !== "production";
  try {
    const token = await getRequestToken(request);
    if (isDev) {
      console.log(`[order-attachments/filter-options] token present: ${!!token}${token ? ` (len=${token.length})` : ""}`);
    }
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await graphqlFetch<KleverOrderUploadFilterOptionsData>({
      query: KLEVER_ORDER_UPLOAD_FILTER_OPTIONS_QUERY,
      token,
      // `revalidate` + a Bearer token would let Next.js cache the response
      // across requests/users. This is a per-customer query — disable caching.
      cache: "no-store",
    });

    if (isDev) {
      console.log("[order-attachments/filter-options] OK");
    }
    return NextResponse.json(data.kleverOrderUploadFilterOptions ?? {}, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      console.error(
        `[order-attachments/filter-options] GraphQL error: status=${error.status} message=${error.message}`,
        error.errors,
      );
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    console.error("[order-attachments/filter-options] Unexpected error:", error);
    return NextResponse.json(
      { message: "Server error fetching filter options" },
      { status: 500 },
    );
  }
}
