from collections import defaultdict
from decimal import Decimal
from django.db.models import Sum
from django.db.models.functions import ExtractYear
from django.utils import timezone
from apps.transactions.models import Dividend, Interest
from apps.portfolio.services import calculate_realized_pnl


def _default_year(y):
    return {
        "year": y,
        "dividends_gross": "0", "dividends_tax": "0", "dividends_net": "0",
        "interests_gross": "0", "interests_net": "0",
        "sales_pnl": "0",
        "total_net": "0",
    }


def year_summary():
    dividend_by_year = (
        Dividend.objects.annotate(year=ExtractYear("date"))
        .values("year")
        .annotate(
            total_gross=Sum("gross"),
            total_tax=Sum("tax"),
            total_net=Sum("net"),
        )
        .order_by("year")
    )

    interest_by_year = (
        Interest.objects.annotate(year=ExtractYear("date"))
        .values("year")
        .annotate(
            total_gross=Sum("gross"),
            total_net=Sum("net"),
        )
        .order_by("year")
    )

    years = {}
    for d in dividend_by_year:
        y = d["year"]
        years.setdefault(y, _default_year(y))
        years[y]["dividends_gross"] = str(d["total_gross"] or Decimal("0"))
        years[y]["dividends_tax"] = str(d["total_tax"] or Decimal("0"))
        years[y]["dividends_net"] = str(d["total_net"] or Decimal("0"))

    for i in interest_by_year:
        y = i["year"]
        years.setdefault(y, _default_year(y))
        years[y]["interests_gross"] = str(i["total_gross"] or Decimal("0"))
        years[y]["interests_net"] = str(i["total_net"] or Decimal("0"))

    # Realized sales P&L grouped by year
    realized = calculate_realized_pnl()
    sales_by_year = {}
    for sale in realized["realized_sales"]:
        y = int(sale["date"][:4])
        sales_by_year.setdefault(y, Decimal("0"))
        sales_by_year[y] += Decimal(sale["realized_pnl"])

    for y, pnl in sales_by_year.items():
        years.setdefault(y, _default_year(y))
        years[y]["sales_pnl"] = str(pnl)

    for y in years.values():
        y["total_net"] = str(
            Decimal(y["dividends_net"]) + Decimal(y["interests_net"]) + Decimal(y["sales_pnl"])
        )

    return sorted(years.values(), key=lambda x: x["year"])


def rv_evolution():
    """Return portfolio value time series from PortfolioSnapshot records."""
    from apps.assets.models import PortfolioSnapshot

    snapshots = (
        PortfolioSnapshot.objects.order_by("captured_at")
        .values("captured_at", "total_market_value")
    )

    return [
        {
            "captured_at": snap["captured_at"].isoformat(),
            "value": str(snap["total_market_value"]),
        }
        for snap in snapshots
        if snap["total_market_value"] > 0
    ]


def patrimonio_evolution():
    """Return monthly patrimony evolution using PortfolioSnapshot + AccountSnapshot.

    Investment values come exclusively from the LAST PortfolioSnapshot within each
    calendar month. For past months without a snapshot, the cumulative transaction
    cost basis is shown as an approximation (net capital deployed: BUY/GIFT cost
    minus SELL proceeds). Cash values carry forward from AccountSnapshot.

    The current month always uses LIVE portfolio values (current prices via FIFO)
    instead of carrying forward the last snapshot.
    """
    from apps.assets.models import AccountSnapshot, Asset, PortfolioSnapshot, PositionSnapshot
    from apps.transactions.models import Transaction
    from apps.portfolio.services import calculate_portfolio

    EQUITY_TYPES = {"STOCK", "ETF", "CRYPTO"}
    asset_type_map = dict(Asset.objects.values_list("id", "type"))

    # --- Cash: last AccountSnapshot balance per month, carry-forward ---
    # AccountSnapshot rows are entered manually and may be sparse; carry-forward
    # is intentional here so we always have a cash figure alongside investments.
    account_balances = {}  # account_id -> latest balance
    monthly_cash = {}      # "YYYY-MM" -> total cash

    for snap in AccountSnapshot.objects.order_by("date").values("account_id", "date", "balance"):
        month_key = snap["date"].strftime("%Y-%m")
        account_balances[snap["account_id"]] = snap["balance"]
        monthly_cash[month_key] = sum(account_balances.values(), Decimal("0"))

    # --- Investments: LAST PortfolioSnapshot per month, NO carry-forward ---
    # Iterating ascending and overwriting ensures dict ends up with the
    # snapshot of greatest captured_at for each calendar month.
    monthly_portfolio = {}  # "YYYY-MM" -> {"batch_id": ..., "total_market_value": ...}

    for snap in PortfolioSnapshot.objects.order_by("captured_at").values(
        "captured_at", "batch_id", "total_market_value"
    ):
        month_key = snap["captured_at"].strftime("%Y-%m")
        monthly_portfolio[month_key] = snap

    if not monthly_portfolio and not monthly_cash:
        return []

    # --- Cumulative transaction cost basis (workaround for months without snapshots) ---
    # For past months where we have no PortfolioSnapshot (i.e. before tracking started),
    # show the net capital deployed: sum of BUY/GIFT costs minus SELL proceeds.
    # This is an approximation — actual cost basis would need full FIFO — but it's
    # good enough to give the chart a meaningful investment line before snapshots exist.
    running_cost = Decimal("0")
    tx_cost_by_month = {}  # "YYYY-MM" -> cumulative net invested cost at end of that month

    for tx in Transaction.objects.order_by("date", "created_at").values(
        "date", "type", "quantity", "price", "commission"
    ):
        month_key = tx["date"].strftime("%Y-%m")
        qty = tx["quantity"] or Decimal("0")
        price = tx["price"] or Decimal("0")
        commission = tx["commission"] or Decimal("0")
        if tx["type"] in ("BUY", "GIFT"):
            running_cost += qty * price + commission
        elif tx["type"] == "SELL":
            running_cost -= qty * price - commission
        tx_cost_by_month[month_key] = running_cost

    # --- Breakdown by type using PositionSnapshot ---
    selected_batch_ids = {snap["batch_id"] for snap in monthly_portfolio.values()}
    batch_rv = defaultdict(Decimal)
    batch_rf = defaultdict(Decimal)

    for pos in PositionSnapshot.objects.filter(batch_id__in=selected_batch_ids).values(
        "batch_id", "asset_id", "market_value"
    ):
        asset_type = asset_type_map.get(pos["asset_id"], "")
        if asset_type in EQUITY_TYPES:
            batch_rv[pos["batch_id"]] += pos["market_value"]
        else:
            batch_rf[pos["batch_id"]] += pos["market_value"]

    # --- Compute LIVE portfolio values for the current month ---
    live_total = Decimal("0")
    live_rv = Decimal("0")
    live_rf = Decimal("0")
    try:
        live_portfolio = calculate_portfolio()
        live_total = Decimal(live_portfolio["total_market_value"])
        for pos in live_portfolio["positions"]:
            mv = Decimal(pos["market_value"])
            if pos["asset_type"] in EQUITY_TYPES:
                live_rv += mv
            else:
                live_rf += mv
    except Exception:
        live_total = Decimal("0")

    # --- Combine: ALL months with any data + always include current month ---
    # Cash: carry-forward (AccountSnapshots entered manually, may be sparse).
    # Investments:
    #   - Current month                 → LIVE portfolio values (current prices).
    #   - Past month with snapshot      → use the snapshot (market value).
    #   - Past month, no snapshot       → cumulative tx cost basis (BUY/GIFT − SELL).
    from django.utils import timezone as tz
    current_month = tz.now().strftime("%Y-%m")

    all_months_set = (
        set(monthly_cash.keys())
        | set(monthly_portfolio.keys())
        | set(tx_cost_by_month.keys())
    )
    # Ensure current month always appears so live values are shown.
    if monthly_portfolio or live_total > 0:
        all_months_set.add(current_month)
    all_months = sorted(all_months_set)

    last_cash = Decimal("0")
    last_tx_cost = Decimal("0")        # carry-forward: cumulative net invested cost from txs
    last_portfolio_data: tuple | None = None  # (total_investments, rv, rf)
    result = []

    for month in all_months:
        if month in monthly_cash:
            last_cash = monthly_cash[month]

        # Advance the tx cost carry-forward if there were transactions this month
        if month in tx_cost_by_month:
            last_tx_cost = tx_cost_by_month[month]

        if month == current_month:
            # Current month: always use LIVE portfolio values (current prices).
            total_investments = live_total
            rv = live_rv
            rf = live_rf
        elif month in monthly_portfolio:
            portfolio = monthly_portfolio[month]
            total_investments = Decimal(str(portfolio["total_market_value"]))
            bid = portfolio["batch_id"]
            rv = batch_rv.get(bid, Decimal("0"))
            rf = batch_rf.get(bid, Decimal("0"))
            last_portfolio_data = (total_investments, rv, rf)
        else:
            # Past month with no snapshot → show cumulative transaction cost as proxy.
            total_investments = max(last_tx_cost, Decimal("0"))
            rv = Decimal("0")
            rf = Decimal("0")

        result.append({
            "month": month,
            "cash": str(last_cash),
            "investments": str(total_investments),
            "renta_variable": str(rv),
            "renta_fija": str(rf),
        })

    return result
