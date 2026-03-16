# ADR-001: Adopt BFF Pattern (Browser → Next.js → Django)

## Status

Accepted

## Date

2025

## Context

Fintrack has a Django REST API backend and a Next.js frontend. The frontend needs to make authenticated API calls to Django. Two approaches were considered:

1. **Direct API calls**: Browser calls Django API directly, managing tokens in JavaScript
2. **BFF (Backend-for-Frontend)**: Browser calls Next.js Route Handlers, which proxy requests to Django

Key concerns:
- JWT tokens must be protected from XSS attacks
- Token refresh should be transparent to the user
- SSR pages need to fetch data server-side with auth context
- A demo mode needs to intercept API calls without a backend

## Decision

Adopt the BFF pattern. All browser requests go through Next.js Route Handlers (`/api/proxy/[...path]` and `/api/auth/[...path]`), which:

1. Read JWT from httpOnly cookies (inaccessible to JavaScript)
2. Attach `Authorization: Bearer` header to Django requests
3. Handle 401 responses by transparently refreshing tokens
4. Return Django responses to the browser with updated cookies

## Consequences

### Positive

- **Security**: Tokens never exposed to client-side JavaScript (XSS-proof)
- **Transparent refresh**: 401 → refresh → retry happens server-side; user never sees auth failures
- **SSR compatibility**: Server Components use `djangoFetch()` with the same cookie-based auth
- **Demo mode**: Route Handlers can intercept requests and return static data without a backend
- **Unified API surface**: Browser always calls `/api/*` on the same origin (no CORS for browser)

### Negative

- **Extra hop**: Every API call goes through Next.js before reaching Django (~1-5ms overhead)
- **Complexity**: Two proxy route handlers to maintain (`proxy/[...path]`, `auth/[...path]`)
- **Debugging**: Network traces show Next.js ↔ Django, not Browser ↔ Django

## Alternatives Considered

- **Direct API calls with token in localStorage**: Rejected due to XSS vulnerability
- **Direct API calls with httpOnly cookies + CORS**: Would work but loses SSR data fetching and demo mode capabilities
