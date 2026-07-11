import { NextRequest, NextResponse } from "next/server";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_TYRE_SIZE_RIM_QUERY } from "@/src/graphql/queries";
import type { KleverTyreSizeRimData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    const { searchParams } = new URL(request.url);
    const width = searchParams.get("width");
    const height = searchParams.get("height");

    const data = await graphqlFetch<KleverTyreSizeRimData>({
      query: KLEVER_TYRE_SIZE_RIM_QUERY,
      variables: { width, height },
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      revalidate: 3600,
      tags: [`tyre-size:rim:${width || "_"}:${height || "_"}`],
    });
    return NextResponse.json(data.kleverTyreSizeRim, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { error: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
