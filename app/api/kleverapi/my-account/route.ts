import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { CUSTOMER_QUERY } from "@/src/graphql/queries";
import { CREATE_CUSTOMER_ADDRESS_MUTATION } from "@/src/graphql/mutations";
import type { CreateCustomerAddressData, CustomerData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

function toCustomerAddressInput(raw: Record<string, unknown>) {
  const street = Array.isArray(raw.street)
    ? (raw.street as unknown[]).map(String).filter(Boolean)
    : raw.street
      ? [String(raw.street)]
      : [];

  const input: Record<string, unknown> = {
    firstname: raw.firstname,
    lastname: raw.lastname,
    telephone: raw.telephone,
    street,
    city: raw.city,
    postcode: raw.postcode,
    country_code: raw.country_code ?? raw.country_id ?? raw.countryCode ?? raw.countryId,
    default_shipping: Boolean(raw.default_shipping ?? raw.isDefaultShipping),
    default_billing: Boolean(raw.default_billing ?? raw.isDefaultBilling),
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

export async function GET(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    
    const data = await graphqlFetch<CustomerData>({
      query: CUSTOMER_QUERY,
      token,
      store: request.headers.get("x-store-code") || getLocaleFromRequest(request),
      cache: "no-store",
    });

    if (!data.customer) {
      return NextResponse.json({ message: "Customer not found." }, { status: 404 });
    }
    return NextResponse.json(data.customer, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json({ message: "Failed to fetch account details." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    if (!body || typeof body !== "object" || !("address" in body)) {
      return NextResponse.json(
        {
          message:
            "POST /api/kleverapi/my-account only accepts {address: {...}} for address creation. Use PUT /api/kleverapi/addresses/[id] for updates.",
        },
        { status: 400 },
      );
    }

    const input = toCustomerAddressInput(body.address as Record<string, unknown>);

    const data = await graphqlFetch<CreateCustomerAddressData>({
      query: CREATE_CUSTOMER_ADDRESS_MUTATION,
      variables: { input },
      token,
      cache: "no-store",
    });

    return NextResponse.json(data.createCustomerAddress, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { message: "Server-side error updating account details." },
      { status: 500 },
    );
  }
}
