import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_ORDER_FILTER_OPTIONS_QUERY } from "@/src/graphql/queries";
import type { KleverOrderFilterOptionsData } from "@/src/graphql/types";
import { graphqlFetch } from "@/lib/graphqlFetch";

const FALLBACK = ["All", "Check Pending"];

export async function GET(request: Request) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await graphqlFetch<KleverOrderFilterOptionsData>({
      query: KLEVER_ORDER_FILTER_OPTIONS_QUERY,
      token,
      cache: "no-store",
    });

    const statusOptions = data.kleverOrderFilterOptions?.status_options ?? [];
    if (statusOptions.length === 0) {
      return NextResponse.json(FALLBACK);
    }

    const labels = statusOptions.map((o) => o.label).filter(Boolean);
    const items = labels.includes("All") ? labels : ["All", ...labels];
    return NextResponse.json(items);
  } catch (error) {
    console.error("[order-statuses] GraphQL error, serving fallback:", error);
    return NextResponse.json(FALLBACK);
  }
}
