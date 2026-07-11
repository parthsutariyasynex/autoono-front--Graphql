import { NextResponse } from "next/server";
import { REQUEST_PASSWORD_RESET_EMAIL_MUTATION } from "@/src/graphql/mutations";
import type { RequestPasswordResetEmailData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email;

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const data = await graphqlFetch<RequestPasswordResetEmailData>({
      query: REQUEST_PASSWORD_RESET_EMAIL_MUTATION,
      variables: { email },
      cache: "no-store",
    });

    return NextResponse.json(
      { success: data.requestPasswordResetEmail !== false },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 400 },
      );
    }
    return NextResponse.json({ message: "Forgot-password request failed" }, { status: 500 });
  }
}
