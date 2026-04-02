from decimal import Decimal

from rest_framework import serializers

from .models import Amortization, Property

ZERO = Decimal("0.00")


class PropertySerializer(serializers.ModelSerializer):
    net_equity = serializers.SerializerMethodField()
    amortized_capital = serializers.SerializerMethodField()
    has_mortgage = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = [
            "id",
            "name",
            "current_value",
            "purchase_price",
            "purchase_date",
            "currency",
            "notes",
            "original_loan_amount",
            "outstanding_balance",
            "annual_interest_rate",
            "total_term_months",
            "months_paid",
            "monthly_payment",
            # computed
            "net_equity",
            "amortized_capital",
            "has_mortgage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_net_equity(self, obj):
        balance = obj.outstanding_balance or ZERO
        return str((obj.current_value - balance).quantize(Decimal("0.01")))

    def get_amortized_capital(self, obj):
        if obj.original_loan_amount is None:
            return None
        balance = obj.outstanding_balance or ZERO
        return str((obj.original_loan_amount - balance).quantize(Decimal("0.01")))

    def get_has_mortgage(self, obj):
        return obj.original_loan_amount is not None


class AmortizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Amortization
        fields = ["id", "property", "month", "amount", "strategy", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class MortgageSimulationInputSerializer(serializers.Serializer):
    STRATEGY_CHOICES = [
        ("REDUCE_PAYMENT", "Reduce monthly payment"),
        ("REDUCE_TERM", "Reduce term"),
    ]

    outstanding_balance = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    annual_interest_rate = serializers.DecimalField(max_digits=6, decimal_places=4, min_value=Decimal("0"))
    remaining_months = serializers.IntegerField(min_value=1)
    monthly_payment = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal("0.01"))
    extra_payment = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))
    strategy = serializers.ChoiceField(choices=STRATEGY_CHOICES)
