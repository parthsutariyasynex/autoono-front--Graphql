import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_SUBMIT_ENQUIRY_MUTATION } from "@/src/graphql/mutations";
import type { KleverSubmitEnquiryData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized: Missing customer token" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const productSku = body.productSku ?? body.product_sku ?? body.sku;
    const productName = body.productName ?? body.product_name ?? body.name;
    const qty = Number(body.qty ?? body.quantity ?? 1);
    if (!productSku || !productName || !qty) {
      return NextResponse.json(
        { message: "productSku, productName, qty are required" },
        { status: 400 },
      );
    }

    const data = await graphqlFetch<KleverSubmitEnquiryData>({
      query: KLEVER_SUBMIT_ENQUIRY_MUTATION,
      variables: {
        productSku,
        productName,
        qty,
        comment: body.comment ?? null,
        phone: body.phone ?? body.telephone ?? null,
        notifyStock: typeof body.notifyStock === "boolean" ? body.notifyStock : null,
      },
      token,
      cache: "no-store",
    });

    return NextResponse.json(
      { success: data.kleverSubmitEnquiry !== false, message: data.kleverSubmitEnquiry },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
