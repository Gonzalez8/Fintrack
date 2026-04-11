import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { DJANGO_INTERNAL_URL, COOKIE_ACCESS, COOKIE_REFRESH, IS_DEMO, isDemoToken } from "@/lib/constants";

// Fake JWT tokens for demo mode (exp year 2099, demo: true flag)
const DEMO_ACCESS = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ user_id: 1, username: "demo", exp: 4102444800, iat: Math.floor(Date.now() / 1000), demo: true })).toString("base64url"),
  "demo-sig",
].join(".");
const DEMO_REFRESH = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ token_type: "refresh", user_id: 1, exp: 4102444800, iat: Math.floor(Date.now() / 1000), demo: true })).toString("base64url"),
  "demo-ref-sig",
].join(".");

function demoCookieHeaders(): HeadersInit {
  return [
    ["Set-Cookie", `${COOKIE_ACCESS}=${DEMO_ACCESS}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`],
    ["Set-Cookie", `${COOKIE_REFRESH}=${DEMO_REFRESH}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`],
  ];
}

/**
 * Auth proxy: handles /api/auth/* routes.
 *
 * When IS_DEMO is enabled, demo login (username "demo") returns fake tokens.
 * Requests from an active demo session (token has demo flag) get fake responses.
 * Everything else is proxied to the real backend (Django / Supabase / etc).
 */
async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const joined = path.join("/");
  const djangoPath = `/api/auth/${joined}${joined.endsWith("/") ? "" : "/"}`;

  // Buffer body for POST/PUT so we can read it and still forward it
  const body = req.method !== "GET" && req.method !== "HEAD"
    ? await req.arrayBuffer()
    : undefined;

  if (IS_DEMO) {
    const cleanPath = djangoPath.split("?")[0].replace(/\/$/, "");

    // Login: only intercept if username is "demo"
    if (cleanPath === "/api/auth/token" && req.method === "POST" && body) {
      try {
        const parsed = JSON.parse(new TextDecoder().decode(body));
        if (parsed.username === "demo") {
          return resolveDemoAuth(djangoPath, req.method);
        }
      } catch { /* not JSON, fall through to real backend */ }
    }

    // For all other routes, check if the current session is a demo session
    const cookieStore = await cookies();
    const access = cookieStore.get(COOKIE_ACCESS)?.value;
    if (isDemoToken(access)) {
      return resolveDemoAuth(djangoPath, req.method);
    }
  }

  // ── Real backend proxy ──
  const target = `${DJANGO_INTERNAL_URL}${djangoPath}`;

  const cookieStore = await cookies();
  const access = cookieStore.get(COOKIE_ACCESS)?.value;
  const refresh = cookieStore.get(COOKIE_REFRESH)?.value;

  const cookieHeader = [
    access && `${COOKIE_ACCESS}=${access}`,
    refresh && `${COOKIE_REFRESH}=${refresh}`,
  ]
    .filter(Boolean)
    .join("; ");

  const headers = new Headers();
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  if (cookieHeader) headers.set("Cookie", cookieHeader);

  let djangoRes: Response;
  try {
    djangoRes = await fetch(target, {
      method: req.method,
      headers,
      body,
    });
  } catch (err) {
    console.error(`[auth-proxy] fetch to ${target} failed:`, err);
    return NextResponse.json(
      { detail: "Backend unavailable" },
      { status: 502 },
    );
  }

  // Build response forwarding Django's body and status
  const resHeaders = new Headers();
  djangoRes.headers.forEach((v, k) => {
    const lower = k.toLowerCase();
    if (lower !== "transfer-encoding" && lower !== "connection") {
      resHeaders.set(k, v);
    }
  });

  // Forward Set-Cookie headers from Django
  const setCookies = djangoRes.headers.getSetCookie();
  if (setCookies.length) {
    for (const sc of setCookies) {
      resHeaders.append("Set-Cookie", sc);
    }
  }

  return new NextResponse(djangoRes.body, {
    status: djangoRes.status,
    headers: resHeaders,
  });
}

// ---------------------------------------------------------------------------
// Demo mode auth resolver
// ---------------------------------------------------------------------------

async function resolveDemoAuth(
  authPath: string,
  method: string,
): Promise<NextResponse> {
  const cleanPath = authPath.split("?")[0].replace(/\/$/, "");
  const { demoUser } = await import("@/demo/data");

  // Login / token
  if (cleanPath === "/api/auth/token" && method === "POST") {
    return NextResponse.json(
      { access: DEMO_ACCESS, user: demoUser },
      { headers: demoCookieHeaders() },
    );
  }

  // Token refresh
  if (cleanPath === "/api/auth/token/refresh" && method === "POST") {
    return NextResponse.json(
      { access: DEMO_ACCESS },
      { headers: demoCookieHeaders() },
    );
  }

  // Logout
  if (cleanPath === "/api/auth/logout" && method === "POST") {
    return new NextResponse(null, { status: 204 });
  }

  // Me
  if (cleanPath === "/api/auth/me") {
    return NextResponse.json(demoUser);
  }

  // Profile
  if (cleanPath === "/api/auth/profile") {
    if (method === "PUT") return NextResponse.json({ ok: true });
    return NextResponse.json({ username: demoUser.username, email: demoUser.email });
  }

  // Register / Google
  if ((cleanPath === "/api/auth/register" || cleanPath === "/api/auth/google") && method === "POST") {
    return NextResponse.json(
      { access: DEMO_ACCESS, user: demoUser },
      { headers: demoCookieHeaders() },
    );
  }

  // Change password
  if (cleanPath === "/api/auth/change-password" && method === "POST") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
