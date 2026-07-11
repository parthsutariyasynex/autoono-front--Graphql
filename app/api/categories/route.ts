import { NextRequest, NextResponse } from "next/server";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { CATEGORIES_QUERY } from "@/src/graphql/queries";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

function buildFilters(searchParams: URLSearchParams) {
    const ids = searchParams.get("ids");
    if (ids) {
        const list = ids.split(",").map((s) => s.trim()).filter(Boolean);
        return { ids: list.length > 1 ? { in: list } : { eq: list[0] } };
    }

    const urlKey = searchParams.get("urlKey");
    if (urlKey) {
        return { url_key: { eq: urlKey } };
    }

    return { parent_id: { eq: searchParams.get("parentId") || "2" } };
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    try {
        const data = await graphqlFetch({
            query: CATEGORIES_QUERY,
            variables: {
                filters: buildFilters(searchParams),
                pageSize: Number(searchParams.get("pageSize") || "50"),
                currentPage: Number(searchParams.get("currentPage") || "1"),
            },
            store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
            cache: "no-store",
        });

        return NextResponse.json(data);
    } catch (error) {
        if (isGraphQLRequestError(error)) {
            return NextResponse.json(
                { message: error.message, errors: error.errors },
                { status: error.status || 500 },
            );
        }

        return NextResponse.json(
            { message: "Failed to load categories." },
            { status: 500 },
        );
    }
}
