import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_REMOVE_NOTIFICATION_MUTATION } from "@/src/graphql/mutations";
import type { KleverRemoveNotificationData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

async function handle(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json(
        { message: "Unauthorized: Missing customer token" },
        { status: 401 },
      );
    }
    const { id } = await params;
    const notificationId = Number(id);
    if (!notificationId) {
      return NextResponse.json({ message: "Invalid notification id" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverRemoveNotificationData>({
      query: KLEVER_REMOVE_NOTIFICATION_MUTATION,
      variables: { notificationId },
      token,
      cache: "no-store",
    });
    return NextResponse.json(data.kleverRemoveNotification, { status: 200 });
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

export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
