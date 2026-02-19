from rest_framework import serializers
from .models import Asset, Account, Settings


class AssetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = [
            "id", "name", "ticker", "type", "currency",
            "current_price", "price_mode", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "current_price", "created_at", "updated_at"]


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ["id", "name", "type", "currency", "balance", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class SettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Settings
        fields = [
            "base_currency", "cost_basis_method", "gift_cost_mode",
            "rounding_money", "rounding_qty", "price_update_interval",
        ]
