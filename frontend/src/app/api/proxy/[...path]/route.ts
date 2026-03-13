import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { DJANGO_INTERNAL_URL, COOKIE_ACCESS, COOKIE_REFRESH } from "@/lib/constants";

/**
 * BFF proxy: forwards any request from the browser to Django API.
 * Browser calls /api/proxy/assets/ → Django http://backend:8000/api/assets/
 *
 * If the access token is expired, automatically refreshes it using the
 * refresh token and retries the original request once.
 */
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const joined = path.join("/");
  const needsSlash = !joined.endsWith("/") && !joined.includes(".");
  const djangoPath = `/api/${joined}${needsSlash ? "/" : ""}`;
  const url = new URL(req.url);
  const search = url.search;
  const target = `${DJANGO_INTERNAL_URL}${djangoPath}${search}`;

  const cookieStore = await cookies();
  let access = cookieStore.get(COOKIE_ACCESS)?.value;
  const refresh = cookieStore.get(COOKIE_REFRESH)?.value;

  // For non-GET requests, buffer the body so we can retry after refresh
  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.arrayBuffer()
    : undefined;

  const buildHeaders = (token?: string) => {
    const h = new Headers();
    const contentType = req.headers.get("content-type");
    if (contentType) h.set("Content-Type", contentType);
    const cookieParts = [
      token && `${COOKIE_ACCESS}=${token}`,
      refresh && `${COOKIE_REFRESH}=${refresh}`,
    ].filter(Boolean).join("; ");
    if (cookieParts) h.set("Cookie", cookieParts);
    return h;
  };

  let djangoRes = await fetch(target, {
    method: req.method,
    headers: buildHeaders(access),
    body,
  });

  // If 401 and we have a refresh token, try to get a new access token and retry
  if (djangoRes.status === 401 && refresh) {
    const refreshRes = await fetch(
      `${DJANGO_INTERNAL_URL}/api/auth/token/refresh/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `${COOKIE_REFRESH}=${refresh}`,
        },
      },
    );

    if (refreshRes.ok) {
      // Extract the new access token from Set-Cookie headers
      const setCookies = refreshRes.headers.getSetCookie();
      let newAccess: string | undefined;
      for (const sc of setCookies) {
        if (sc.startsWith(`${COOKIE_ACCESS}=`)) {
          newAccess = sc.split("=")[1].split(";")[0];
        }
      }

      if (newAccess) {
        access = newAccess;

        // Retry the original request with the new access token
        djangoRes = await fetch(target, {
          method: req.method,
          headers: buildHeaders(newAccess),
          body,
        });

        // Build response and forward the refreshed cookies to the browser
        const resHeaders = buildResponseHeaders(djangoRes);
        for (const sc of setCookies) {
          resHeaders.append("Set-Cookie", sc);
        }
        return new NextResponse(djangoRes.body, {
          status: djangoRes.status,
          headers: resHeaders,
        });
      }
    }
  }

  // Normal response (no refresh needed)
  const resHeaders = buildResponseHeaders(djangoRes);
  return new NextResponse(djangoRes.body, {
    status: djangoRes.status,
    headers: resHeaders,
  });
}

function buildResponseHeaders(djangoRes: Response): Headers {
  const resHeaders = new Headers();
  djangoRes.headers.forEach((v, k) => {
    const lower = k.toLowerCase();
    if (lower !== "transfer-encoding" && lower !== "connection") {
      resHeaders.set(k, v);
    }
  });
  const setCookies = djangoRes.headers.getSetCookie();
  for (const sc of setCookies) {
    resHeaders.append("Set-Cookie", sc);
  }
  return resHeaders;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
