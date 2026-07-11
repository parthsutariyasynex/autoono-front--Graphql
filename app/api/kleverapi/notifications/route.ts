import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_NOTIFICATIONS_QUERY } from "@/src/graphql/queries";
import type { KleverNotificationsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

export async function GET(req: NextRequest) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized: Missing customer token" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const pageSize = Number(searchParams.get("pageSize") || "15");
    const currentPage = Number(searchParams.get("currentPage") || "1");

    const data = await graphqlFetch<KleverNotificationsData>({
      query: KLEVER_NOTIFICATIONS_QUERY,
      variables: { pageSize, currentPage },
      token,
      cache: "no-store",
    });

    const result = data.kleverNotifications;
    if (!result) {
      console.warn("[notifications] kleverNotifications returned null — backend may have no notifications for this user/store");
      return NextResponse.json({ items: [], total_count: 0, unread_count: 0 });
    }
    console.log(`[notifications] OK — total=${result.total_count} unread=${result.unread_count} items=${result.items?.length}`);
    return NextResponse.json({
      items: result.items,
      total_count: result.total_count,
      unread_count: result.unread_count,
    });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      console.error("[notifications] GraphQL error:", error.status, error.message, error.errors);
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    console.error("[notifications] Unexpected error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
