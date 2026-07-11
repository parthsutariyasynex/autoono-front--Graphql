import { NextRequest, NextResponse } from "next/server";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { CMS_PAGE_QUERY } from "@/src/graphql/queries";
import type { CmsPageData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ identifier: string }> },
) {
  try {
    const { identifier } = await params;
    if (!identifier) {
      return NextResponse.json({ message: "identifier is required" }, { status: 400 });
    }

    const data = await graphqlFetch<CmsPageData>({
      query: CMS_PAGE_QUERY,
      variables: { identifier },
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      revalidate: 300,
      tags: [`cms-page:${identifier}`],
    });

    if (!data.cmsPage) {
      return NextResponse.json({ message: "CMS page not found" }, { status: 404 });
    }

    return NextResponse.json({ identifier, ...data.cmsPage }, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      const status = error.status >= 400 ? error.status : 500;
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status },
      );
    }
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
