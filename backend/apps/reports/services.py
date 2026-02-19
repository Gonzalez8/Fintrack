from decimal import Decimal
from django.db.models import Sum
from django.db.models.functions import ExtractYear
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
