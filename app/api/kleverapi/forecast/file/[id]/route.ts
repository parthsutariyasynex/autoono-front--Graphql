/**
 * Binary file proxy — intentionally NOT a GraphQL route.
 *
 * Why this stays REST:
 *   - Forecast file metadata + URL come from `kleverForecastList` GraphQL —
 *     the frontend reads `file_url` from a list item and passes it here as
 *     `?url=` along with the forecast id.
 *   - GraphQL transports JSON; it cannot stream XLSX/PDF bytes. The actual
 *     binary download must happen over plain HTTP.
 *   - This proxy stays server-side so the Magento bearer token is never
 *     exposed to the browser network tab. The token is read from the request
 *     (cookies / Authorization header) on the server and forwarded only to
 *     Magento's REST endpoint, then the bytes are streamed back to the client.
 */
import { NextResponse } from 'next/server';
import { getBaseUrl } from '@/lib/api/magento-url';

// BASE_URL is obtained per-request via getBaseUrl(request)

// Fix double slashes in URL path (but preserve https://)
function fixUrl(url: string): string {
    return url.replace(/(https?:\/\/)|(\/)+/g, (match, protocol) => protocol || '/');
}

async function tryFetchFile(url: string, headers: Record<string, string> = {}): Promise<Response | null> {
    console.log('[ForecastDownload] Trying:', url);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers,
            cache: 'no-store',
        });

        if (!response.ok) {
            console.log('[ForecastDownload] Failed:', response.status, url);
            return null;
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';

        // Check if we got HTML instead of file
        if (contentType.includes('text/html')) {
            console.log('[ForecastDownload] Got HTML, skipping:', url);
            return null;
        }

        return response;
    } catch (err) {
        console.log('[ForecastDownload] Fetch error for:', url, err);
        return null;
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const BASE_URL = getBaseUrl(request);
        const { id } = await params;
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { message: 'Unauthorized: Missing customer token' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const fileName = searchParams.get('file_name');
        const fileUrl = searchParams.get('url');
        const origin = new URL(BASE_URL || 'https://autoono-demo.btire.com').origin;

        console.log('[ForecastDownload] ID:', id, 'File Name:', fileName, 'URL:', fileUrl);

        // Build list of URLs to try
        const urlsToTry: string[] = [];

        // 1. Precise provided URL if available
        if (fileUrl) {
            urlsToTry.push(fixUrl(fileUrl));
        }

        // 2. Magento direct download endpoint if it exists
        urlsToTry.push(`${BASE_URL}/forecast/download/${id}`);

        // 3. Fallback: Common Media paths
        if (fileName) {
            urlsToTry.push(`${origin}/media/orderupload/${fileName}`);
            urlsToTry.push(`${origin}/pub/media/orderupload/${fileName}`);
            urlsToTry.push(`${origin}/media/forecast/${fileName}`);
            urlsToTry.push(`${origin}/pub/media/forecast/${fileName}`);
        }

        // Try each URL
        for (const url of urlsToTry) {
            // Use auth header for API endpoints
            const isApiUrl = url.includes('/rest/') || url.includes('/download/');
            const headers: Record<string, string> = isApiUrl
                ? { Authorization: authHeader, platform: 'web' }
                : {};

            const res = await tryFetchFile(url, headers);
            if (res) {
                const contentType = res.headers.get('content-type') || 'application/octet-stream';
                const blob = await res.blob();

                if (blob.size === 0) continue;

                console.log('[ForecastDownload] Success! URL:', url, 'Type:', contentType);

                return new Response(blob, {
                    status: 200,
                    headers: {
                        'Content-Type': contentType,
                        'Content-Length': blob.size.toString(),
                        'Content-Disposition': `attachment; filename="${fileName || 'forecast'}"`,
                    },
                });
            }
        }

        return NextResponse.json(
            { message: 'Unable to open forecast file. File not accessible.' },
            { status: 404 }
        );

    } catch (error: any) {
        console.error('[ForecastDownload] Catch error:', error);
        return NextResponse.json(
            { message: error.message || 'Server error downloading file' },
            { status: 500 }
        );
    }
}
