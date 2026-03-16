# ADR-002: Store JWT in httpOnly Cookies

## Status

Accepted

## Date

2025

## Context

The application needs to persist JWT tokens (access + refresh) across page reloads. Common storage options:

1. **localStorage/sessionStorage**: Accessible to JavaScript, vulnerable to XSS
2. **In-memory (React state)**: Lost on page refresh, requires re-login
3. **httpOnly cookies**: Sent automatically by browser, inaccessible to JavaScript

The original Fintrack v1 used access tokens in Zustand (memory) and refresh tokens in httpOnly cookies. This meant access tokens were lost on refresh, requiring frequent token refreshes.

## Decision

Store **both** access and refresh tokens in httpOnly cookies with `SameSite=Lax`.

| Cookie | Name | Lifetime | Flags |
|--------|------|----------|-------|
| Access | `access_token` | 15 minutes | httpOnly, SameSite=Lax, Secure (prod) |
| Refresh | `refresh_token` | 7 days | httpOnly, SameSite=Lax, Secure (prod) |

Django sets cookies on login/refresh; Next.js reads them server-side and forwards to Django as `Authorization: Bearer` headers.

## Consequences

### Positive

- **XSS-proof**: JavaScript cannot access tokens
- **Persistent sessions**: Tokens survive page refresh without re-login
- **Automatic sending**: Browser attaches cookies to same-origin requests
- **SSR-compatible**: Next.js middleware and Server Components can read cookies

### Negative

- **CSRF risk**: Mitigated by `SameSite=Lax` (only sent on top-level navigation, not cross-origin POST)
- **Cookie size**: Two cookies add ~1KB to every request header
- **Refresh rotation**: Must blacklist old refresh tokens (enabled via simplejwt `BLACKLIST_AFTER_ROTATION`)

## Configuration

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
}
```
