import { NextRequest, NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { getLocaleFromRequest } from "@/lib/api/magento-url";
import { CUSTOMER_QUERY, KLEVER_DASHBOARD_QUERY } from "@/src/graphql/queries";
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
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const store = request.headers.get("x-store-code") || getLocaleFromRequest(request);

    // Fetch standard customer + kleverDashboard in parallel.
    // kleverDashboard.customer carries custom_attributes (mobile, company_name,
    // customer_code, industry, credit fields etc.) and addresses with company +
    // country_id that the account page needs but CUSTOMER_QUERY doesn't return.
    const [customerResult, dashboardResult] = await Promise.allSettled([
      graphqlFetch<CustomerData>({
        query: CUSTOMER_QUERY,
        token,
        store,
        cache: "no-store",
      }),
      graphqlFetch<{ kleverDashboard: any }>({
        query: KLEVER_DASHBOARD_QUERY,
        token,
        store,
        cache: "no-store",
      }),
    ]);

    const customer = customerResult.status === "fulfilled" ? customerResult.value.customer : null;
    if (!customer) {
      return NextResponse.json({ message: "Customer not found." }, { status: 404 });
    }

    const dashCustomer =
      dashboardResult.status === "fulfilled"
        ? dashboardResult.value?.kleverDashboard?.customer ?? null
        : null;

    // Merge custom_attributes from dashboard into standard customer response.
    // Also normalise addresses: add company + country_id (dashboard uses country_id,
    // standard query uses country_code) and map is_default_billing/shipping fields.
    const mergedAddresses = (customer.addresses ?? []).map((addr: any) => {
      const dashAddr = (dashCustomer?.addresses ?? []).find(
        (da: any) => String(da.id) === String(addr.id)
      );
      return {
        ...addr,
        company: dashAddr?.company ?? addr.company ?? null,
        country_id: dashAddr?.country_id ?? addr.country_code ?? null,
        default_billing: addr.default_billing ?? dashAddr?.is_default_billing ?? false,
        default_shipping: addr.default_shipping ?? dashAddr?.is_default_shipping ?? false,
      };
    });

    const merged = {
      ...customer,
      addresses: mergedAddresses,
      custom_attributes: dashCustomer?.custom_attributes ?? [],
    };

    return NextResponse.json(merged, { status: 200 });
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
