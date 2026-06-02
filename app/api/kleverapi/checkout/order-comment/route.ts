import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CHECKOUT_ORDER_COMMENT_QUERY } from "@/src/graphql/queries";
import { KLEVER_CHECKOUT_SET_ORDER_COMMENT_MUTATION } from "@/src/graphql/mutations";
import type {
  KleverCheckoutOrderCommentData,
  KleverCheckoutSetOrderCommentData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const data = await graphqlFetch<KleverCheckoutOrderCommentData>({
      query: KLEVER_CHECKOUT_ORDER_COMMENT_QUERY,
      token,
      cache: "no-store",
    });
    return NextResponse.json({ comment: data.kleverCheckoutOrderComment ?? "" }, { status: 200 });
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
    const comment = body.comment ?? body.message ?? body.value ?? "";

    const data = await graphqlFetch<KleverCheckoutSetOrderCommentData>({
      query: KLEVER_CHECKOUT_SET_ORDER_COMMENT_MUTATION,
      variables: { comment },
      token,
      cache: "no-store",
    });
    return NextResponse.json(
      { success: data.kleverCheckoutSetOrderComment !== false, comment },
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
