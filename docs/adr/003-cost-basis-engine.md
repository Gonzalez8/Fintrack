# ADR-003: Build In-House Cost Basis Engine (FIFO/LIFO/WAC)

## Status

Accepted

## Date

2025

## Context

Portfolio tracking requires calculating cost basis for each position to determine unrealized and realized P&L. Three standard methods exist:

- **FIFO** (First In, First Out): Sell oldest lots first
- **LIFO** (Last In, First Out): Sell newest lots first
- **WAC** (Weighted Average Cost): Average cost across all shares

No existing Django package provides multi-method cost basis calculation with gift handling, multi-account tracking, and configurable rounding.

## Decision

Build a custom cost basis engine in `apps/portfolio/services.py` that:

1. Processes all transactions chronologically per asset
2. Supports FIFO, LIFO, and WAC methods (user-configurable)
3. Maintains separate cost methods for portfolio display vs. fiscal reporting
4. Handles gift transactions with configurable cost modes (ZERO or MARKET)
5. Tracks positions per account (which account holds which shares)
6. Detects and logs over-sell scenarios

### Architecture

```python
# Dispatcher
_process_transactions(user, method=None)
    ├── _process_lot_based(user, lifo=False)  # FIFO or LIFO
    └── _process_wac(user)                     # Weighted Average Cost

# Builder
_build_portfolio(lots, asset_map, ...)
    → {totals, accounts, positions, realized_sales}
```

**Lot-based (FIFO/LIFO)**: Uses `collections.deque` per asset. BUY appends lots `{qty, price_per_unit}`. SELL pops from front (FIFO) or back (LIFO), computing cost basis per lot consumed.

**WAC**: Tracks `total_qty` and `total_cost` per asset. On SELL, computes `avg_price = total_cost / total_qty` for cost basis.

## Consequences

### Positive

- **Full control**: Exact rounding, gift handling, multi-account tracking
- **Dual methods**: Portfolio display and fiscal reporting can use different methods
- **No external dependency**: No third-party library to maintain
- **Comprehensive output**: Positions, realized sales, account balances, weighted allocations

### Negative

- **Maintenance burden**: ~400 lines of financial logic to maintain and test
- **No tax-lot optimization**: No automated tax-loss harvesting (out of scope)
- **Sequential processing**: All transactions processed in memory per request (cached for 60s)
