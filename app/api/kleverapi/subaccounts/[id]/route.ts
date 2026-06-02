import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { KLEVER_SUBACCOUNT_BY_ID_QUERY } from "@/src/graphql/queries";
import {
  KLEVER_UPDATE_SUBACCOUNT_MUTATION,
  KLEVER_DELETE_SUBACCOUNT_MUTATION,
} from "@/src/graphql/mutations";
import type {
  KleverDeleteSubaccountData,
  KleverSubaccountByIdData,
  KleverUpdateSubaccountData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

function toPermissionsArray(raw: unknown): number[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((v) => Number(v)).filter((n) => Number.isFinite(n));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authorization required" }, { status: 401 });
    }

    const { id } = await params;
    const subaccountId = Number(id);
    if (!subaccountId) {
      return NextResponse.json({ message: "Invalid subaccount id" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverSubaccountByIdData>({
      query: KLEVER_SUBACCOUNT_BY_ID_QUERY,
      variables: { subaccountId },
      token,
      cache: "no-store",
    });

    if (!data.kleverSubaccountById) {
      return NextResponse.json({ message: "Subaccount not found" }, { status: 404 });
    }
    return NextResponse.json(data.kleverSubaccountById, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server-side error fetching sub account." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authorization required" }, { status: 401 });
    }

    const { id } = await params;
    const subaccountId = Number(id);
    if (!subaccountId) {
      return NextResponse.json({ message: "Invalid subaccount id" }, { status: 400 });
    }

    const body = await request.json();
    const variables: Record<string, unknown> = {
      subaccountId,
      firstname: body.firstname ?? null,
      lastname: body.lastname ?? null,
      email: body.email ?? null,
      password: body.password ?? null,
      isActive: typeof body.isActive === "number" ? body.isActive : body.is_active,
      permissions: toPermissionsArray(body.permissions),
      taxvat: body.taxvat ?? null,
    };

    const data = await graphqlFetch<KleverUpdateSubaccountData>({
      query: KLEVER_UPDATE_SUBACCOUNT_MUTATION,
      variables,
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverUpdateSubaccount, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server-side error updating sub account." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authorization required" }, { status: 401 });
    }

    const { id } = await params;
    const subaccountId = Number(id);
    if (!subaccountId) {
      return NextResponse.json({ message: "Invalid subaccount id" }, { status: 400 });
    }

    const data = await graphqlFetch<KleverDeleteSubaccountData>({
      query: KLEVER_DELETE_SUBACCOUNT_MUTATION,
      variables: { subaccountId },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.kleverDeleteSubaccount, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server-side error deleting sub account." }, { status: 500 });
  }
}
