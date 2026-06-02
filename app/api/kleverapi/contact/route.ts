import { NextRequest, NextResponse } from "next/server";
import { CONTACT_US_MUTATION } from "@/src/graphql/mutations";
import type { ContactUsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name;
    const email = body.email;
    const comment = body.comment ?? body.message;
    const telephone = body.telephone ?? body.phone ?? null;

    if (!name || !email || !comment) {
      return NextResponse.json(
        { message: "name, email and comment are required" },
        { status: 400 },
      );
    }

    const data = await graphqlFetch<ContactUsData>({
      query: CONTACT_US_MUTATION,
      variables: { input: { name, email, comment, telephone } },
      cache: "no-store",
    });

    return NextResponse.json(
      { success: Boolean(data.contactUs.status) },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 400 },
      );
    }
    return NextResponse.json({ message: "Failed to send message" }, { status: 500 });
  }
}
