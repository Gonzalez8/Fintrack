# ADR-004: Multi-Tenancy via Owner Foreign Key

## Status

Accepted

## Date

2025

## Context

Fintrack is designed as a self-hosted application that can support multiple users on the same instance. Each user's financial data must be completely isolated.

Approaches considered:
1. **Separate databases per user**: Maximum isolation, high operational overhead
2. **Schema-per-tenant** (PostgreSQL schemas): Good isolation, complex migrations
3. **Row-level filtering** (shared tables with owner FK): Simplest, requires discipline

## Decision

Use row-level filtering with an `owner` ForeignKey on every user-owned model.

### Implementation

**Abstract base model:**
```python
class UserOwnedModel(TimeStampedModel):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
```

**ViewSet mixin (`OwnedByUserMixin`):**
- `get_queryset()` → `super().filter(owner=request.user)`
- `perform_create()` → auto-injects `owner=request.user`
- `perform_update()/perform_destroy()` → invalidates per-user caches

All 10 user-facing models inherit from `UserOwnedModel`. Every ViewSet uses `OwnedByUserMixin`.

## Consequences

### Positive

- **Simple**: One database, one schema, standard Django ORM
- **Consistent**: Single mixin enforces isolation across all ViewSets
- **Cache-friendly**: Per-user Redis namespaces (`ft:{user_id}:{namespace}`)
- **Backup-friendly**: JSON export filtered by owner

### Negative

- **Risk of leaks**: A missing `OwnedByUserMixin` or raw SQL query could expose data. Mitigated by consistent use of the mixin and no raw SQL in the codebase.
- **Shared indexes**: All users share the same database indexes. Mitigated by composite indexes including `owner` (e.g., `(owner, ticker)`, `(owner, date)`).
- **No cross-tenant queries**: Admin views must explicitly scope by user.
