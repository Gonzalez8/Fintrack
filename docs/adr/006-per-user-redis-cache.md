# ADR-006: Per-User Redis Cache Namespaces

## Status

Accepted

## Date

2025

## Context

Portfolio calculations, report generation, and settings lookups are expensive operations that should be cached. In a multi-tenant system, cache invalidation must be scoped per user — a transaction change by User A should not invalidate User B's cache.

## Decision

Implement per-user Redis cache namespaces with the key format:

```
ft:{user_id}:{namespace}
```

### Namespaces

| Namespace | TTL | Content |
|-----------|-----|---------|
| `portfolio` | 60s | Full portfolio calculation (positions, totals) |
| `reports_patrimonio` | 120s | Patrimonio evolution data |
| `reports_rv` | 120s | Variable income evolution |
| `reports_savings` | 120s | Monthly savings report |
| `reports_year` | 120s | Year summary |
| `reports_annual_savings` | 120s | Annual savings aggregates |
| `settings` | 3600s | User settings object |

### Invalidation

All financial namespaces are grouped in a `FINANCIAL_NAMESPACES` tuple. When any financial mutation occurs (via `OwnedByUserMixin.perform_create/update/destroy`), all financial namespaces for that user are invalidated.

Settings cache is invalidated only on settings update.

## Consequences

### Positive

- **User isolation**: Cache invalidation is scoped per user
- **Automatic**: `OwnedByUserMixin` handles invalidation — no manual cache management
- **Selective TTLs**: Settings (rarely change) cached longer than portfolio (frequently change)
- **Bulk invalidation**: Single call clears all financial caches for a user

### Negative

- **Redis dependency**: Cache miss during Redis downtime falls through to database (graceful degradation)
- **Memory**: Each active user has up to 7 cached keys. Mitigated by TTL-based expiration.
- **Cold start**: First request after invalidation is slower (full recalculation)
