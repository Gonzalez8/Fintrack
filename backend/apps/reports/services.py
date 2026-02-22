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

    Investment values come exclusively from PortfolioSnapshot/PositionSnapshot records
    (created by the scheduler). Cash values come from AccountSnapshot.
    Missing months carry forward the last known values.
    """
    from apps.assets.models import AccountSnapshot, Asset, PortfolioSnapshot, PositionSnapshot

    EQUITY_TYPES = {"STOCK", "ETF", "CRYPTO"}
    asset_type_map = dict(Asset.objects.values_list("id", "type"))

    # --- Cash: last AccountSnapshot balance per month, carry-forward ---
    account_balances = {}  # account_id -> latest balance
    monthly_cash = {}      # "YYYY-MM" -> total cash

    for snap in AccountSnapshot.objects.order_by("date").values("account_id", "date", "balance"):
        month_key = snap["date"].strftime("%Y-%m")
        account_balances[snap["account_id"]] = snap["balance"]
        monthly_cash[month_key] = sum(account_balances.values(), Decimal("0"))

    # --- Investments: last PortfolioSnapshot per month, carry-forward ---
    monthly_portfolio = {}  # "YYYY-MM" -> {"batch_id": ..., "total_market_value": ...}

    for snap in PortfolioSnapshot.objects.order_by("captured_at").values(
        "captured_at", "batch_id", "total_market_value"
    ):
        month_key = snap["captured_at"].strftime("%Y-%m")
        monthly_portfolio[month_key] = snap

    if not monthly_portfolio and not monthly_cash:
        return []

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

    # --- Combine all months with carry-forward ---
    all_months = sorted(set(monthly_cash.keys()) | set(monthly_portfolio.keys()))

    last_cash = Decimal("0")
    last_portfolio = None
    result = []

    for month in all_months:
        if month in monthly_cash:
            last_cash = monthly_cash[month]
        if month in monthly_portfolio:
            last_portfolio = monthly_portfolio[month]

        if last_portfolio:
            total_investments = Decimal(str(last_portfolio["total_market_value"]))
            bid = last_portfolio["batch_id"]
            rv = batch_rv.get(bid, Decimal("0"))
            rf = batch_rf.get(bid, Decimal("0"))
        else:
            total_investments = Decimal("0")
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
