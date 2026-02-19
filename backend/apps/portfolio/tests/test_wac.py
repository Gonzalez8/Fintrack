from decimal import Decimal
import pytest
from apps.assets.models import Asset, Account, Settings
from apps.transactions.models import Transaction
from apps.portfolio.services import calculate_portfolio


@pytest.fixture
def setup_data(db):
    Settings.load()
    account = Account.objects.create(name="Test Broker", type="BROKER")
    asset = Asset.objects.create(
        name="Test Stock", ticker="TST", current_price=Decimal("150.00")
    )
    return account, asset


@pytest.mark.django_db
class TestWAC:
    def test_single_buy(self, setup_data):
        account, asset = setup_data
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("1"),
        )
        result = calculate_portfolio()
        pos = result["positions"][0]
        assert pos["quantity"] == "10.000000"
        assert pos["cost_total"] == "1001.00"
        assert pos["avg_cost"] == "100.10"

    def test_two_buys_wac(self, setup_data):
        account, asset = setup_data
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
        )
        Transaction.objects.create(
            date="2024-02-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("200"), commission=Decimal("0"),
        )
        result = calculate_portfolio()
        pos = result["positions"][0]
        assert pos["quantity"] == "20.000000"
        assert pos["cost_total"] == "3000.00"
        assert pos["avg_cost"] == "150.00"

    def test_buy_sell_reduces_position(self, setup_data):
        account, asset = setup_data
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
        )
        Transaction.objects.create(
            date="2024-02-01", type="SELL", asset=asset, account=account,
            quantity=Decimal("5"), price=Decimal("120"), commission=Decimal("0"),
        )
        result = calculate_portfolio()
        pos = result["positions"][0]
        assert pos["quantity"] == "5.000000"
        assert pos["cost_total"] == "500.00"

    def test_gift_zero_cost(self, setup_data):
        account, asset = setup_data
        Transaction.objects.create(
            date="2024-01-01", type="GIFT", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
        )
        result = calculate_portfolio()
        pos = result["positions"][0]
        assert pos["quantity"] == "10.000000"
        assert pos["cost_total"] == "0.00"
