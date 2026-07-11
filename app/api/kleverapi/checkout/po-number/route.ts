import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CHECKOUT_PO_NUMBER_QUERY } from "@/src/graphql/queries";
import { KLEVER_CHECKOUT_SET_PO_NUMBER_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverCheckoutPoNumberData,
  KleverCheckoutSetPoNumberData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const data = await graphqlFetch<KleverCheckoutPoNumberData>({
      query: KLEVER_CHECKOUT_PO_NUMBER_QUERY,
      token,
      cache: "no-store",
    });
    return NextResponse.json({ po_number: data.kleverCheckoutPoNumber ?? null }, { status: 200 });
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

export async function POST(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const poNumber = body.poNumber ?? body.po_number ?? body.value ?? "";
    if (!poNumber) {
      return NextResponse.json({ message: "poNumber is required" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverCheckoutSetPoNumberData>({
      query: KLEVER_CHECKOUT_SET_PO_NUMBER_MUTATION,
      variables: { poNumber },
      token,
      cache: "no-store",
    });
    return NextResponse.json(
      { success: data.kleverCheckoutSetPoNumber !== false, po_number: poNumber },
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
