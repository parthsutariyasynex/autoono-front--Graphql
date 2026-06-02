import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_ORDER_ATTACHMENTS_QUERY } from "@/src/graphql/queries";
import type { KleverOrderAttachmentsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { orderId } = await params;
    const id = Number(orderId);
    if (!id) {
      return NextResponse.json({ message: "Invalid order id" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverOrderAttachmentsData>({
      query: KLEVER_ORDER_ATTACHMENTS_QUERY,
      variables: { orderId: id },
      token,
      cache: "no-store",
    });

    return NextResponse.json(
      data.kleverOrderAttachments ?? { attachments: [] },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { message: "Server error fetching order attachments" },
      { status: 500 },
    );
  }
}
