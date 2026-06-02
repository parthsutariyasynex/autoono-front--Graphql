import { NextResponse } from "next/server";
import { getRequestToken } from "@/lib/api/auth-helper";
import { PICKUP_LOCATIONS_QUERY } from "@/src/graphql/queries";
import type { PickupLocationsData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

const DEFAULT_COUNTRY = process.env.MAGENTO_DEFAULT_COUNTRY || "AE";

export async function GET(req: Request) {
  try {
    const token = await getRequestToken(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const countryCode = searchParams.get("country") || DEFAULT_COUNTRY;
    const pageSize = Number(searchParams.get("pageSize") || "50");
    const currentPage = Number(searchParams.get("currentPage") || "1");

    const data = await graphqlFetch<PickupLocationsData>({
      query: PICKUP_LOCATIONS_QUERY,
      variables: { countryCode, pageSize, currentPage },
      token,
      cache: "no-store",
    });

    const stores = data.pickupLocations.items.map((loc) => ({
      store_id: loc.pickup_location_code,
      name: loc.name,
      address: loc.street,
      city: loc.city,
      country: loc.country_id,
      postcode: loc.postcode,
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));
    return NextResponse.json(stores, { status: 200 });
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
