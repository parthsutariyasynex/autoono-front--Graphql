import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { CUSTOMER_QUERY } from "@/src/graphql/queries";
import {
  UPDATE_CUSTOMER_ADDRESS_MUTATION,
  DELETE_CUSTOMER_ADDRESS_MUTATION,
} from "@/src/graphql/mutations";
import type {
  CustomerData,
  UpdateCustomerAddressData,
  DeleteCustomerAddressData,
} from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

function toCustomerAddressInput(raw: Record<string, unknown>) {
  const street = Array.isArray(raw.street)
    ? (raw.street as unknown[]).map(String).filter(Boolean)
    : raw.street
      ? [String(raw.street)]
      : undefined;

  const input: Record<string, unknown> = {
    firstname: raw.firstname,
    lastname: raw.lastname,
    telephone: raw.telephone,
    street,
    city: raw.city,
    postcode: raw.postcode,
    country_code: raw.country_code ?? raw.country_id,
    default_shipping: raw.default_shipping,
    default_billing: raw.default_billing,
  };

  if (raw.region && typeof raw.region === "object") {
    input.region = raw.region;
  } else if (raw.region_code || raw.region) {
    input.region = {
      region: raw.region ?? null,
      region_code: raw.region_code ?? null,
    };
  }

  Object.keys(input).forEach((k) => {
    if (input[k] === undefined || input[k] === null) delete input[k];
  });
  return input;
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
    const targetId = Number(id);
    if (!targetId) {
      return NextResponse.json({ message: "Invalid address id" }, { status: 400 });
    }

    const data = await graphqlFetch<CustomerData>({
      query: CUSTOMER_QUERY,
      token,
      cache: "no-store",
    });
    const match = data.customer?.addresses?.find((a) => Number(a.id) === targetId) ?? null;
    if (!match) {
      return NextResponse.json({ message: "Address not found" }, { status: 404 });
    }
    return NextResponse.json(match, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server-side error fetching address." }, { status: 500 });
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
    const targetId = Number(id);
    if (!targetId) {
      return NextResponse.json({ message: "Invalid address id" }, { status: 400 });
    }

    const body = await request.json();
    const raw = (body.address ?? body) as Record<string, unknown>;
    const input = toCustomerAddressInput(raw);

    const data = await graphqlFetch<UpdateCustomerAddressData>({
      query: UPDATE_CUSTOMER_ADDRESS_MUTATION,
      variables: { id: targetId, input },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.updateCustomerAddress, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server-side error updating address." }, { status: 500 });
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
    const targetId = Number(id);
    if (!targetId) {
      return NextResponse.json({ message: "Invalid address id" }, { status: 400 });
    }

    const data = await graphqlFetch<DeleteCustomerAddressData>({
      query: DELETE_CUSTOMER_ADDRESS_MUTATION,
      variables: { id: targetId },
      token,
      cache: "no-store",
    });

    return NextResponse.json(
      { success: data.deleteCustomerAddress !== false, deleted: targetId },
      { status: 200 },
    );
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Server-side error deleting address." }, { status: 500 });
  }
}
