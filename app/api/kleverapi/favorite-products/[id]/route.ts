import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_REMOVE_FAVORITE_PRODUCT_MUTATION } from "@/src/graphql/mutations";
import type { KleverRemoveFavoriteProductData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;
    const productId = Number(id);
    if (!productId) {
      return NextResponse.json({ message: "Invalid product id" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverRemoveFavoriteProductData>({
      query: KLEVER_REMOVE_FAVORITE_PRODUCT_MUTATION,
      variables: { productId },
      token,
      cache: "no-store",
    });

    return NextResponse.json(
      { success: data.kleverRemoveFavoriteProduct !== false, product_id: productId },
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
      { message: "Server-side error removing favorite." },
      { status: 500 },
    );
  }
}
