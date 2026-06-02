import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_CHECKOUT_PO_REMOVE_FILE_MUTATION } from "@/src/graphql/mutations";
import type { KleverCheckoutPoRemoveFileData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const { filename } = await params;
    const fileName = decodeURIComponent(filename);
    if (!fileName) {
      return NextResponse.json({ message: "filename is required" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverCheckoutPoRemoveFileData>({
      query: KLEVER_CHECKOUT_PO_REMOVE_FILE_MUTATION,
      variables: { fileName },
      token,
      cache: "no-store",
    });
    return NextResponse.json(
      { success: data.kleverCheckoutPoRemoveFile !== false, fileName },
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
