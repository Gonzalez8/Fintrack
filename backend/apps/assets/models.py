from django.db import models
from apps.core.models import TimeStampedModel


class Asset(TimeStampedModel):
    class AssetType(models.TextChoices):
        STOCK = "STOCK", "Stock"
        FUND = "FUND", "Fund"
        CRYPTO = "CRYPTO", "Crypto"
        CASHLIKE = "CASHLIKE", "Cash-like"

    class PriceMode(models.TextChoices):
        MANUAL = "MANUAL", "Manual"
        AUTO = "AUTO", "Auto"

    name = models.CharField(max_length=200)
    ticker = models.CharField(max_length=20, unique=True, null=True, blank=True)
    type = models.CharField(max_length=10, choices=AssetType.choices, default=AssetType.STOCK)
    currency = models.CharField(max_length=3, default="EUR")
    current_price = models.DecimalField(max_digits=20, decimal_places=6, null=True, blank=True)
    price_mode = models.CharField(max_length=10, choices=PriceMode.choices, default=PriceMode.MANUAL)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.ticker or 'N/A'})"


class Account(TimeStampedModel):
    class AccountType(models.TextChoices):
        OPERATIVA = "OPERATIVA", "Operativa"
        AHORRO = "AHORRO", "Ahorro"
        INVERSION = "INVERSION", "Inversión"
        DEPOSITOS = "DEPOSITOS", "Depósitos"
        ALTERNATIVOS = "ALTERNATIVOS", "Alternativos"

    name = models.CharField(max_length=200, unique=True)
    type = models.CharField(max_length=15, choices=AccountType.choices, default=AccountType.OPERATIVA)
    currency = models.CharField(max_length=3, default="EUR")
    balance = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Settings(models.Model):
    class CostBasisMethod(models.TextChoices):
        WAC = "WAC", "Weighted Average Cost"

    class GiftCostMode(models.TextChoices):
        ZERO = "ZERO", "Zero cost"
        MARKET = "MARKET", "Market price"

    base_currency = models.CharField(max_length=3, default="EUR")
    cost_basis_method = models.CharField(
        max_length=10, choices=CostBasisMethod.choices, default=CostBasisMethod.WAC
    )
    gift_cost_mode = models.CharField(
        max_length=10, choices=GiftCostMode.choices, default=GiftCostMode.ZERO
    )
    rounding_money = models.PositiveSmallIntegerField(default=2)
    rounding_qty = models.PositiveSmallIntegerField(default=6)
    price_update_interval = models.PositiveIntegerField(
        default=0,
        help_text="Auto-update interval in minutes. 0 = disabled (manual only).",
    )

    class Meta:
        verbose_name_plural = "settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Settings"
