# ADR-005: Demo Mode with MSW and Static Data

## Status

Accepted

## Date

2025

## Context

Fintrack needs a "Try Demo" experience on the landing/login page that:
- Works without a running backend (e.g., Vercel-only deployment)
- Coexists with real authentication on the same deployment
- Shows realistic data across all 12 dashboard pages

## Decision

Implement demo mode using a combination of:

1. **Fake JWT tokens**: Login as "demo/demo" returns tokens with `demo: true` in the payload and a fake signature (`demo-sig`). These are real httpOnly cookies that pass through middleware.

2. **Server-side interception**: The BFF proxy (`/api/proxy/[...path]`) detects `isDemoToken(access)` and returns static data from `/demo/server-data.ts` instead of calling Django.

3. **Client-side MSW (optional fallback)**: Mock Service Worker handlers intercept `/api/*` calls in the browser for any client-side requests that bypass the proxy.

4. **Static data**: ~1,700 lines of hand-crafted demo data across 10 files (assets, accounts, transactions, dividends, portfolio, reports, charts).

### Activation

- `NEXT_PUBLIC_DEMO_MODE=true` shows the "Try Demo" button on the login page
- Demo sessions are identified by the `demo: true` flag in the JWT payload
- Real login/registration works normally alongside demo mode

## Consequences

### Positive

- **No backend needed**: Works on Vercel with just the frontend
- **Coexists with real auth**: Same deployment serves demo and real users
- **Realistic experience**: All 12 pages show data with proper formatting
- **Fast**: Static data, no network latency for demo requests

### Negative

- **Static data**: Demo data doesn't respond to mutations (create/edit/delete are no-ops)
- **Maintenance**: Demo data must be updated when models change
- **Fake tokens**: Must ensure fake tokens can't escalate to real backend access (mitigated: backend rejects fake signatures)
