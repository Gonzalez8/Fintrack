from decimal import Decimal
import pytest
from django.contrib.auth.models import User
from apps.assets.models import Asset, Account, Settings
from apps.transactions.models import Transaction
from apps.portfolio.services import calculate_portfolio, calculate_realized_pnl


@pytest.fixture
def user(db):
    return User.objects.create_user(username="fifo_user", password="pass")


@pytest.fixture
def setup_data(user):
    Settings.load(user)
    account = Account.objects.create(name="Test Broker", type="OPERATIVA", owner=user)
    asset = Asset.objects.create(
        name="Test Stock", ticker="TST", current_price=Decimal("150.00"), owner=user
    )
    return account, asset


@pytest.mark.django_db
class TestFIFO:
    def test_single_buy(self, user, setup_data):
        account, asset = setup_data
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("1"),
            owner=user,
        )
        result = calculate_portfolio(user)
        pos = result["positions"][0]
        assert pos["quantity"] == "10.000000"
        assert pos["cost_total"] == "1001.00"
        assert pos["avg_cost"] == "100.10"

    def test_two_buys_cost_accumulates(self, user, setup_data):
        account, asset = setup_data
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=user,
        )
        Transaction.objects.create(
            date="2024-02-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("200"), commission=Decimal("0"),
            owner=user,
        )
        result = calculate_portfolio(user)
        pos = result["positions"][0]
        assert pos["quantity"] == "20.000000"
        assert pos["cost_total"] == "3000.00"
        assert pos["avg_cost"] == "150.00"

    def test_buy_sell_reduces_position(self, user, setup_data):
        account, asset = setup_data
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=user,
        )
        Transaction.objects.create(
            date="2024-02-01", type="SELL", asset=asset, account=account,
            quantity=Decimal("5"), price=Decimal("120"), commission=Decimal("0"),
            owner=user,
        )
        result = calculate_portfolio(user)
        pos = result["positions"][0]
        assert pos["quantity"] == "5.000000"
        assert pos["cost_total"] == "500.00"

    def test_gift_zero_cost(self, user, setup_data):
        account, asset = setup_data
        Transaction.objects.create(
            date="2024-01-01", type="GIFT", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=user,
        )
        result = calculate_portfolio(user)
        pos = result["positions"][0]
        assert pos["quantity"] == "10.000000"
        assert pos["cost_total"] == "0.00"


@pytest.fixture
def wac_user(db):
    return User.objects.create_user(username="wac_user", password="pass")


@pytest.fixture
def wac_setup(wac_user):
    s = Settings.load(wac_user)
    s.cost_basis_method = "WAC"
    s.save()
    account = Account.objects.create(name="WAC Broker", type="OPERATIVA", owner=wac_user)
    asset = Asset.objects.create(
        name="WAC Stock", ticker="WAC", current_price=Decimal("150.00"), owner=wac_user
    )
    return account, asset


@pytest.mark.django_db
class TestWAC:
    def test_single_buy(self, wac_user, wac_setup):
        account, asset = wac_setup
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("1"),
            owner=wac_user,
        )
        result = calculate_portfolio(wac_user)
        pos = result["positions"][0]
        assert pos["quantity"] == "10.000000"
        assert pos["cost_total"] == "1001.00"
        assert pos["avg_cost"] == "100.10"

    def test_two_buys_weighted_average(self, wac_user, wac_setup):
        account, asset = wac_setup
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=wac_user,
        )
        Transaction.objects.create(
            date="2024-02-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("200"), commission=Decimal("0"),
            owner=wac_user,
        )
        result = calculate_portfolio(wac_user)
        pos = result["positions"][0]
        assert pos["quantity"] == "20.000000"
        assert pos["cost_total"] == "3000.00"
        # WAC avg_cost = (10*100 + 10*200) / 20 = 150
        assert pos["avg_cost"] == "150.00"

    def test_buy_sell_uses_average_cost(self, wac_user, wac_setup):
        """After two buys at different prices, sell uses weighted average."""
        account, asset = wac_setup
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=wac_user,
        )
        Transaction.objects.create(
            date="2024-02-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("200"), commission=Decimal("0"),
            owner=wac_user,
        )
        Transaction.objects.create(
            date="2024-03-01", type="SELL", asset=asset, account=account,
            quantity=Decimal("5"), price=Decimal("180"), commission=Decimal("0"),
            owner=wac_user,
        )
        result = calculate_portfolio(wac_user)
        pos = result["positions"][0]
        assert pos["quantity"] == "15.000000"
        # WAC: avg = 150, remaining cost = 15 * 150 = 2250
        assert pos["cost_total"] == "2250.00"
        assert pos["avg_cost"] == "150.00"

        # Check realized P&L: sold 5 @ 180, cost 5 * 150 = 750
        realized = calculate_realized_pnl(wac_user)
        sale = realized["realized_sales"][0]
        assert sale["cost_basis"] == "750.00"
        assert sale["sell_total"] == "900.00"
        assert sale["realized_pnl"] == "150.00"

    def test_avg_cost_unchanged_after_partial_sell(self, wac_user, wac_setup):
        """WAC property: average cost doesn't change after a sell."""
        account, asset = wac_setup
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=wac_user,
        )
        Transaction.objects.create(
            date="2024-02-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("200"), commission=Decimal("0"),
            owner=wac_user,
        )
        Transaction.objects.create(
            date="2024-03-01", type="SELL", asset=asset, account=account,
            quantity=Decimal("5"), price=Decimal("180"), commission=Decimal("0"),
            owner=wac_user,
        )
        result = calculate_portfolio(wac_user)
        pos = result["positions"][0]
        # avg_cost should still be 150 after partial sell
        assert pos["avg_cost"] == "150.00"

    def test_fifo_vs_wac_different_realized_pnl(self, wac_user, wac_setup):
        """FIFO and WAC produce different per-sale P&L with two buys at different prices."""
        account, asset = wac_setup
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=wac_user,
        )
        Transaction.objects.create(
            date="2024-02-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("200"), commission=Decimal("0"),
            owner=wac_user,
        )
        Transaction.objects.create(
            date="2024-03-01", type="SELL", asset=asset, account=account,
            quantity=Decimal("5"), price=Decimal("180"), commission=Decimal("0"),
            owner=wac_user,
        )
        # WAC: cost basis = 5 * 150 = 750, P&L = 900 - 750 = 150
        wac_realized = calculate_realized_pnl(wac_user)
        assert wac_realized["realized_sales"][0]["realized_pnl"] == "150.00"

        # Switch to FIFO: cost basis = 5 * 100 = 500, P&L = 900 - 500 = 400
        s = Settings.load(wac_user)
        s.cost_basis_method = "FIFO"
        s.save()
        fifo_realized = calculate_realized_pnl(wac_user)
        assert fifo_realized["realized_sales"][0]["realized_pnl"] == "400.00"

    def test_gift_zero_cost(self, wac_user, wac_setup):
        account, asset = wac_setup
        Transaction.objects.create(
            date="2024-01-01", type="GIFT", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=wac_user,
        )
        result = calculate_portfolio(wac_user)
        pos = result["positions"][0]
        assert pos["quantity"] == "10.000000"
        assert pos["cost_total"] == "0.00"


@pytest.fixture
def lifo_user(db):
    return User.objects.create_user(username="lifo_user", password="pass")


@pytest.fixture
def lifo_setup(lifo_user):
    s = Settings.load(lifo_user)
    s.cost_basis_method = "LIFO"
    s.save()
    account = Account.objects.create(name="LIFO Broker", type="OPERATIVA", owner=lifo_user)
    asset = Asset.objects.create(
        name="LIFO Stock", ticker="LIF", current_price=Decimal("150.00"), owner=lifo_user
    )
    return account, asset


@pytest.mark.django_db
class TestLIFO:
    def test_sell_consumes_last_lot(self, lifo_user, lifo_setup):
        """LIFO sells the most recently bought lot first."""
        account, asset = lifo_setup
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=lifo_user,
        )
        Transaction.objects.create(
            date="2024-02-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("200"), commission=Decimal("0"),
            owner=lifo_user,
        )
        Transaction.objects.create(
            date="2024-03-01", type="SELL", asset=asset, account=account,
            quantity=Decimal("5"), price=Decimal("180"), commission=Decimal("0"),
            owner=lifo_user,
        )
        # LIFO: sells from the 200 lot first, cost = 5 * 200 = 1000
        realized = calculate_realized_pnl(lifo_user)
        sale = realized["realized_sales"][0]
        assert sale["cost_basis"] == "1000.00"
        assert sale["sell_total"] == "900.00"
        assert sale["realized_pnl"] == "-100.00"

    def test_remaining_position_after_lifo_sell(self, lifo_user, lifo_setup):
        """After LIFO sell, remaining position uses the earlier (cheaper) lots."""
        account, asset = lifo_setup
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=lifo_user,
        )
        Transaction.objects.create(
            date="2024-02-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("200"), commission=Decimal("0"),
            owner=lifo_user,
        )
        Transaction.objects.create(
            date="2024-03-01", type="SELL", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("180"), commission=Decimal("0"),
            owner=lifo_user,
        )
        result = calculate_portfolio(lifo_user)
        pos = result["positions"][0]
        assert pos["quantity"] == "10.000000"
        # LIFO consumed all of the 200 lot, remaining = 10 @ 100
        assert pos["cost_total"] == "1000.00"
        assert pos["avg_cost"] == "100.00"

    def test_fifo_vs_lifo_different_pnl(self, lifo_user, lifo_setup):
        """FIFO and LIFO produce different P&L for the same sale."""
        account, asset = lifo_setup
        Transaction.objects.create(
            date="2024-01-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("100"), commission=Decimal("0"),
            owner=lifo_user,
        )
        Transaction.objects.create(
            date="2024-02-01", type="BUY", asset=asset, account=account,
            quantity=Decimal("10"), price=Decimal("200"), commission=Decimal("0"),
            owner=lifo_user,
        )
        Transaction.objects.create(
            date="2024-03-01", type="SELL", asset=asset, account=account,
            quantity=Decimal("5"), price=Decimal("180"), commission=Decimal("0"),
            owner=lifo_user,
        )
        # LIFO: cost = 5 * 200 = 1000, P&L = 900 - 1000 = -100
        lifo_realized = calculate_realized_pnl(lifo_user)
        assert lifo_realized["realized_sales"][0]["realized_pnl"] == "-100.00"

        # Switch to FIFO: cost = 5 * 100 = 500, P&L = 900 - 500 = 400
        s = Settings.load(lifo_user)
        s.cost_basis_method = "FIFO"
        s.save()
        fifo_realized = calculate_realized_pnl(lifo_user)
        assert fifo_realized["realized_sales"][0]["realized_pnl"] == "400.00"
