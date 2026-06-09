// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//     // No rewrites — all API calls go through local route handlers in app/api/
//     // which use getBaseUrl(request) to build locale-aware Magento URLs.
//     //
//     // Previously had hardcoded /rest/en/ rewrites here which broke Arabic store view.
// };

// export default nextConfig;

import type { NextConfig } from "next";

// All 83 API routes have local route handlers in app/api/
// No rewrites needed — route handlers use getBaseUrl(request) for locale-aware Magento URLs
const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "autoono.btire.com",
                pathname: "/**",
            },
        ],
    },
    async headers() {
        return [
            {
                // All page routes — prevent browsers from caching HTML so stale
                // chunk hashes never cause ChunkLoadError after a redeployment.
                source: "/((?!_next/static|_next/image|favicon\\.ico).*)",
                headers: [
                    {
                        key: "Cache-Control",
                        value: "no-cache, no-store, must-revalidate",
                    },
                ],
            },
        ];
    },
};

export default nextConfig;