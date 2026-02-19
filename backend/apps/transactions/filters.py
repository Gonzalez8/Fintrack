import django_filters
from .models import Transaction, Dividend, Interest


class TransactionFilter(django_filters.FilterSet):
    from_date = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    to_date = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    asset_id = django_filters.UUIDFilter(field_name="asset_id")
    account_id = django_filters.UUIDFilter(field_name="account_id")
    type = django_filters.CharFilter(field_name="type")

    class Meta:
        model = Transaction
        fields = []


class DividendFilter(django_filters.FilterSet):
    year = django_filters.NumberFilter(field_name="date", lookup_expr="year")
    asset_id = django_filters.UUIDFilter(field_name="asset_id")

    class Meta:
        model = Dividend
        fields = []


class InterestFilter(django_filters.FilterSet):
    year = django_filters.NumberFilter(field_name="date", lookup_expr="year")
    account_id = django_filters.UUIDFilter(field_name="account_id")

    class Meta:
        model = Interest
        fields = []
