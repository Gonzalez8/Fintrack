import math
from decimal import ROUND_HALF_UP, Decimal

TWO_PLACES = Decimal("0.01")
FOUR_PLACES = Decimal("0.0001")


def _quantize(value):
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def _months_to_years_months(total_months):
    years = total_months // 12
    months = total_months % 12
    return years, months


def _compute_scenario(balance, monthly_rate, num_months, payment):
    """Compute totals for a given mortgage scenario."""
    total_remaining = _quantize(payment * num_months)
    total_interest = _quantize(total_remaining - balance)
    years, months = _months_to_years_months(num_months)
    return {
        "monthly_payment": str(_quantize(payment)),
        "remaining_installments": num_months,
        "total_remaining": str(total_remaining),
        "total_interest": str(total_interest),
        "remaining_years": years,
        "remaining_months": months,
        "monthly_interest_rate": str((monthly_rate * 100).quantize(FOUR_PLACES, rounding=ROUND_HALF_UP)),
    }


def _annuity_payment(balance, monthly_rate, num_months):
    """Calculate monthly payment using the annuity formula.

    P = B * r * (1+r)^n / ((1+r)^n - 1)
    """
    if monthly_rate == 0:
        return _quantize(balance / num_months)
    r = float(monthly_rate)
    n = num_months
    factor = (1 + r) ** n
    payment = float(balance) * r * factor / (factor - 1)
    return _quantize(Decimal(str(payment)))


def _solve_term(balance, monthly_rate, payment):
    """Solve for the number of months given balance, rate, and payment.

    n = -log(1 - B*r/P) / log(1+r)
    """
    if monthly_rate == 0:
        return math.ceil(float(balance) / float(payment))
    r = float(monthly_rate)
    b = float(balance)
    p = float(payment)
    inner = 1 - b * r / p
    if inner <= 0:
        return None  # payment doesn't cover interest
    n = -math.log(inner) / math.log(1 + r)
    return math.ceil(n)


def simulate_amortization(
    outstanding_balance,
    annual_interest_rate,
    remaining_months,
    monthly_payment,
    extra_payment,
    strategy,
):
    """Simulate an early mortgage amortization.

    Returns a dict with current scenario, new scenario, and differences.
    """
    monthly_rate = annual_interest_rate / Decimal("1200")

    # Current scenario
    current = _compute_scenario(
        outstanding_balance,
        monthly_rate,
        remaining_months,
        monthly_payment,
    )

    # New balance after extra payment
    new_balance = outstanding_balance - extra_payment

    if new_balance <= 0:
        # Mortgage fully paid off
        new = {
            "monthly_payment": "0.00",
            "remaining_installments": 0,
            "total_remaining": str(_quantize(extra_payment)),
            "total_interest": "0.00",
            "remaining_years": 0,
            "remaining_months": 0,
            "monthly_interest_rate": current["monthly_interest_rate"],
        }
    elif strategy == "REDUCE_PAYMENT":
        new_payment = _annuity_payment(new_balance, monthly_rate, remaining_months)
        new = _compute_scenario(new_balance, monthly_rate, remaining_months, new_payment)
    else:  # REDUCE_TERM
        new_months = _solve_term(new_balance, monthly_rate, monthly_payment)
        if new_months is None:
            # Payment doesn't cover interest — shouldn't happen with valid data
            new_months = remaining_months
        new = _compute_scenario(new_balance, monthly_rate, new_months, monthly_payment)

    # Compute differences
    diff_payment = _quantize(Decimal(new["monthly_payment"]) - Decimal(current["monthly_payment"]))
    diff_installments = new["remaining_installments"] - int(current["remaining_installments"])
    diff_total = _quantize(Decimal(new["total_remaining"]) - Decimal(current["total_remaining"]))
    diff_interest = _quantize(Decimal(new["total_interest"]) - Decimal(current["total_interest"]))
    diff_total_months = new["remaining_installments"] - int(current["remaining_installments"])
    diff_years, diff_months = _months_to_years_months(abs(diff_total_months))
    if diff_total_months < 0:
        diff_years = -diff_years
        diff_months = -diff_months

    difference = {
        "monthly_payment": str(diff_payment),
        "remaining_installments": diff_installments,
        "total_remaining": str(diff_total),
        "total_interest": str(diff_interest),
        "remaining_years": diff_years,
        "remaining_months": diff_months,
    }

    return {
        "monthly_interest_rate": current["monthly_interest_rate"],
        "current": current,
        "new": new,
        "difference": difference,
        "strategy": strategy,
    }
