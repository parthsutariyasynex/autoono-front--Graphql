import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { CUSTOMER_QUERY } from "@/src/graphql/queries";
import { CREATE_CUSTOMER_ADDRESS_MUTATION } from "@/src/graphql/mutations";
import type { CreateCustomerAddressData, CustomerData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/lib/graphqlFetch";

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
      return NextResponse.json(
        { message: "Authentication required. Authorization header is missing." },
        { status: 401 },
      );
    }

    const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);

    const data = await graphqlFetch<CustomerData>({
      query: CUSTOMER_QUERY,
      token,
      store,
      cache: "no-store",
    });

    const customer = data.customer;
    console.log("[addresses] GraphQL customer.default_billing:", customer?.default_billing);
    console.log("[addresses] GraphQL customer.default_shipping:", customer?.default_shipping);
    console.log("[addresses] GraphQL addresses count:", customer?.addresses?.length ?? 0);
    console.log("[addresses] GraphQL raw addresses:", JSON.stringify(customer?.addresses ?? [], null, 2));

    const rawAddresses = customer?.addresses ?? [];

    // Magento sometimes returns null for default_billing/default_shipping on
    // each address object even when a default is set. Use the customer-level
    // default_billing / default_shipping ID fields as the authoritative source
    // and apply the flags ourselves.
    const defaultBillingId = String(customer?.default_billing ?? "");
    const defaultShippingId = String(customer?.default_shipping ?? "");

    const addresses = rawAddresses.map((addr: any) => ({
      ...addr,
      default_billing:
        addr.default_billing ??
        (defaultBillingId ? String(addr.id) === defaultBillingId : false),
      default_shipping:
        addr.default_shipping ??
        (defaultShippingId ? String(addr.id) === defaultShippingId : false),
    }));

    console.log("[addresses] Enriched addresses:", JSON.stringify(addresses, null, 2));

    return NextResponse.json(addresses, { status: 200 });
  } catch (error) {
    if (isGraphQLRequestError(error)) {
      return NextResponse.json(
        { message: error.message, errors: error.errors },
        { status: error.status >= 400 ? error.status : 500 },
      );
    }
    return NextResponse.json(
      { message: "Server-side error fetching addresses." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getRequestToken(request);
    if (!token) {
      return NextResponse.json({ message: "Authorization required" }, { status: 401 });
    }

    const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);
    const body = await request.json();
    const rawAddress = (body.address ?? body) as Record<string, unknown>;
    const input = toCustomerAddressInput(rawAddress);

    const data = await graphqlFetch<CreateCustomerAddressData>({
      query: CREATE_CUSTOMER_ADDRESS_MUTATION,
      variables: { input },
      token,
      store,
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
      { message: "Server-side error adding address." },
      { status: 500 },
    );
  }
}
