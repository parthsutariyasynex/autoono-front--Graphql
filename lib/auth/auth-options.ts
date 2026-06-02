import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { isValidLocale, defaultLocale, type Locale } from "@/lib/i18n/config";
import { SESSION_COOKIE_NAME, CSRF_COOKIE_NAME, CALLBACK_URL_COOKIE_NAME } from "./constants";
import { GENERATE_CUSTOMER_TOKEN_MUTATION } from "@/src/graphql/mutations";
import type { GenerateCustomerTokenData } from "@/src/graphql/types";
import { graphqlFetch, isGraphQLRequestError } from "@/src/lib/graphqlFetch";

const MAGENTO_DOMAIN =
    process.env.NEXT_PUBLIC_MAGENTO_BASE_URL || "https://autoono-demo.btire.com";

/**
 * Decode a Magento JWT token to read its expiry time.
 * Returns the `exp` timestamp (seconds) or null if unreadable.
 */
function getMagentoTokenExpiry(token: string): number | null {
    try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        const payload = JSON.parse(
            Buffer.from(parts[1], "base64").toString("utf-8")
        );
        return payload.exp || null;
    } catch {
        return null;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Magento",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
                mobile: { label: "Mobile", type: "text" },
                otp: { label: "OTP", type: "text" },
                countryCode: { label: "Country Code", type: "text" },
                locale: { label: "Locale", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials) return null;

                const creds = credentials as Record<string, string | undefined>;
                const isOtp = !!creds.otp;
                const credLocale = creds.locale;
                const locale: Locale =
                    credLocale && isValidLocale(credLocale)
                        ? (credLocale as Locale)
                        : defaultLocale;

                try {
                    let token: string | null = null;

                    if (isOtp) {
                        // REST workaround — GraphQL createCustomerTokenWithOtp
                        // rejects E.164 mobiles via a ≤9-digit validator. REST
                        // accepts mobile + countryCode as separate fields.
                        const rawMobile = creds.mobile ?? "";
                        const rawCountryCode = creds.countryCode ?? "";
                        let mobile = rawMobile.trim();
                        const countryCode = rawCountryCode.trim();
                        if (mobile.startsWith("+") && countryCode && mobile.startsWith(countryCode)) {
                            mobile = mobile.slice(countryCode.length);
                        } else if (mobile.startsWith("+")) {
                            mobile = mobile.replace(/^\+\d{1,3}/, "");
                        }

                        const upstream = await fetch(
                            `${MAGENTO_DOMAIN}/rest/${locale}/V1/kleverapi/login/otp`,
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ mobile, otp: creds.otp, countryCode }),
                                cache: "no-store",
                            },
                        );
                        const data = await upstream.json().catch(() => null);
                        if (!upstream.ok || !data) {
                            console.error("[auth] REST OTP login rejected:", upstream.status, data?.message);
                            return null;
                        }
                        token = data.token || data?.customer?.token || null;
                    } else {
                        const data = await graphqlFetch<GenerateCustomerTokenData>({
                            query: GENERATE_CUSTOMER_TOKEN_MUTATION,
                            variables: {
                                email: creds.email,
                                password: creds.password,
                            },
                            store: locale,
                            cache: "no-store",
                        });
                        token = data.generateCustomerToken?.token ?? null;
                    }

                    if (!token) {
                        console.error("[auth] No token returned from GraphQL");
                        return null;
                    }

                    const trimmedToken = token.trim();
                    return {
                        id: creds.email || creds.mobile || "",
                        email: creds.email || "",
                        name: creds.email || creds.mobile || "",
                        token: trimmedToken,
                    };
                } catch (error) {
                    if (isGraphQLRequestError(error)) {
                        console.error(
                            "[auth] Magento GraphQL rejected login:",
                            error.status,
                            error.message,
                        );
                    } else {
                        console.error("[auth] Unexpected error in authorize:", error);
                    }
                    return null;
                }
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                // Fresh login — always trust the new token; never run expiry check here.
                token.accessToken = (user as any).token;
                token.error = undefined;
                token.magentoTokenExp = undefined;
                const exp = getMagentoTokenExpiry((user as any).token);
                if (exp) token.magentoTokenExp = exp;
            } else if (token.magentoTokenExp) {
                // Subsequent session reads — flag expiry but keep accessToken so
                // in-flight API calls that already have the token still work.
                const now = Math.floor(Date.now() / 1000);
                if (now >= (token.magentoTokenExp as number) - 60) {
                    token.error = "MagentoTokenExpired";
                } else {
                    // Token still valid — clear any stale error from a previous cycle
                    token.error = undefined;
                }
            }
            return token;
        },
        async session({ session, token }) {
            (session as any).accessToken = token.accessToken;
            (session as any).error = token.error;
            return session;
        },
        /**
         * Strict same-origin redirect policy — prevents logout/login from
         * bouncing to another localhost project. Without this, NextAuth's
         * default falls back to baseUrl when origins don't match, which on
         * shared-cookie localhost setups can land on the wrong port.
         */
        async redirect({ url, baseUrl }) {
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            try {
                if (new URL(url).origin === baseUrl) return url;
            } catch { }
            return baseUrl;
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    cookies: {
        sessionToken: {
            name: SESSION_COOKIE_NAME,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        callbackUrl: {
            name: CALLBACK_URL_COOKIE_NAME,
            options: {
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
        csrfToken: {
            name: CSRF_COOKIE_NAME,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};
