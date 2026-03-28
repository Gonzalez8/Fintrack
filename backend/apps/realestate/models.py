from django.db import models

from apps.core.models import UserOwnedModel


class Property(UserOwnedModel):
    name = models.CharField(max_length=200)
    current_value = models.DecimalField(max_digits=14, decimal_places=2)
    purchase_price = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
    )
    purchase_date = models.DateField(null=True, blank=True)
    currency = models.CharField(max_length=3, default="EUR")
    notes = models.TextField(blank=True, default="")

    # Mortgage fields (all nullable — property may be fully owned)
    original_loan_amount = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
    )
    outstanding_balance = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
    )
    annual_interest_rate = models.DecimalField(
        max_digits=6, decimal_places=4, null=True, blank=True,
        help_text="Annual interest rate as percentage, e.g. 2.5000 for 2.5%",
    )
    total_term_months = models.PositiveIntegerField(null=True, blank=True)
    months_paid = models.PositiveIntegerField(null=True, blank=True)
    monthly_payment = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "properties"

    def __str__(self):
        return f"{self.name} ({self.current_value} {self.currency})"


class Amortization(UserOwnedModel):
    STRATEGY_CHOICES = [
        ("REDUCE_PAYMENT", "Reduce monthly payment"),
        ("REDUCE_TERM", "Reduce term"),
    ]

    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="amortizations",
    )
    month = models.PositiveIntegerField(
        help_text="Month number in the schedule (1-based) where the extra payment is applied.",
    )
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    strategy = models.CharField(max_length=20, choices=STRATEGY_CHOICES)

    class Meta:
        ordering = ["month"]
        unique_together = [("property", "month")]

    def __str__(self):
        return f"{self.property.name} m{self.month}: {self.amount} ({self.strategy})"
