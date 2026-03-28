from django.contrib import admin

from .models import Amortization, Property


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("name", "current_value", "outstanding_balance", "currency", "owner")
    list_filter = ("currency",)
    search_fields = ("name",)
    readonly_fields = ("id", "created_at", "updated_at")


@admin.register(Amortization)
class AmortizationAdmin(admin.ModelAdmin):
    list_display = ("property", "month", "amount", "strategy", "owner")
    list_filter = ("strategy",)
    readonly_fields = ("id", "created_at", "updated_at")
