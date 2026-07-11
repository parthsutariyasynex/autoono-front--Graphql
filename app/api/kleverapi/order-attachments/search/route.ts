import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_ORDER_UPLOAD_SEARCH_QUERY } from "@/src/graphql/queries";
import type { KleverOrderUploadSearchData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized", attachments: [] },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("order_id");
    const documentType = searchParams.get("document_type");
    const invoiceDue = searchParams.get("invoice_due");
    const pageSize = Number(searchParams.get("pageSize") || "10");
    const currentPage = Number(searchParams.get("currentPage") || "1");

    const data = await graphqlFetch<KleverOrderUploadSearchData>({
      query: KLEVER_ORDER_UPLOAD_SEARCH_QUERY,
      variables: { pageSize, currentPage },
      token,
      cache: "no-store",
    });

    const result = data.kleverOrderUploadSearch;
    if (!result) {
      return NextResponse.json({ items: [], total_count: 0 }, { status: 200 });
    }

    let items = result.items;
    if (orderId) {
      items = items.filter((i) => String(i.order_id) === String(orderId));
    }
    if (documentType && documentType !== "All") {
      items = items.filter((i) => i.upload_for === documentType);
    }
    if (invoiceDue && invoiceDue !== "All") {
      items = items.filter((i) => i.payment_status === invoiceDue);
    }

    return NextResponse.json({ ...result, items, total_count: items.length }, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors, attachments: [] },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { message: "Server error searching attachments", attachments: [] },
      { status: 500 },
    );
  }
}
