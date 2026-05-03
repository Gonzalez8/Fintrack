"""Tests for the Spanish payslip text-parser.

These tests exercise ``parse_payslip_text`` (a pure function from raw text to
a suggestion dict) so we don't need real PDFs in CI. The thin pdfplumber
wrapper ``extract_text`` is covered via mocking in ``test_parse_pdf_view``.
"""

from decimal import Decimal
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.payroll.services.pdf_parser import (
    parse_es_decimal,
    parse_payslip_text,
)

User = get_user_model()

FIXTURE_DIR = Path(__file__).parent / "fixtures"
PAYSLIP_TEXT = (FIXTURE_DIR / "payslip_sample.txt").read_text(encoding="utf-8")


# ---------------------------------------------------------------------------
# parse_es_decimal
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("1.594,05", Decimal("1594.05")),
        ("5.523,40", Decimal("5523.40")),
        ("259,84", Decimal("259.84")),
        ("0,00", Decimal("0.00")),
        ("100", Decimal("100")),
        ("-100,50", Decimal("-100.50")),
        ("", None),
        ("abc", None),
        ("--", None),
    ],
)
def test_parse_es_decimal(raw, expected):
    assert parse_es_decimal(raw) == expected


# ---------------------------------------------------------------------------
# parse_payslip_text — known-good fixture
# ---------------------------------------------------------------------------


def test_parses_full_spanish_payslip():
    result = parse_payslip_text(PAYSLIP_TEXT)
    s = result["suggested"]

    assert s["period_start"] == "2026-01-01"
    assert s["period_end"] == "2026-01-31"

    # The fixture mirrors the user's January 2026 payslip with anonymised
    # employer data. The numeric assertions track the real payslip values.
    assert s["gross"] == "5523.40"
    assert s["net"] == "3596.97"
    assert s["irpf_withholding"] == "1594.05"
    assert s["base_irpf"] == "5523.40"
    assert s["base_cc"] == "5101.20"
    assert s["employer_cost"] == "7195.54"

    # ss_employee = 239.76 + 7.65 + 0.80 + 5.10 + 79.07 = 332.38
    assert s["ss_employee"] == "332.38"

    # Employer extracted from header
    assert s["employer_name"] == "ACME DEMO S.L."
    assert s["employer_cif"] == "B12345678"

    # All 7 numeric fields detected → confidence == 1.0
    assert result["confidence"] == 1.0


def test_parses_payslip_without_period_block():
    """If the period sentence is missing we still return numeric fields."""
    text = PAYSLIP_TEXT.replace("Mensual - 1 Enero 2026 a 31 Enero 2026", "Mensual")
    result = parse_payslip_text(text)
    assert result["suggested"]["period_start"] is None
    assert result["suggested"]["period_end"] is None
    # Numeric extraction unaffected
    assert result["suggested"]["gross"] == "5523.40"
    assert any("Periodo no detectado" in w for w in result["warnings"])


# ---------------------------------------------------------------------------
# parse_payslip_text — irrelevant inputs
# ---------------------------------------------------------------------------


def test_irrelevant_text_yields_low_confidence():
    text = "This is just an invoice. No payroll fields here.\nAmount: 100€"
    result = parse_payslip_text(text)
    assert result["confidence"] < 0.3
    assert result["suggested"]["gross"] is None


def test_empty_text_yields_zero_confidence():
    result = parse_payslip_text("")
    assert result["confidence"] == 0.0
    for field in (
        "gross",
        "ss_employee",
        "irpf_withholding",
        "net",
        "base_irpf",
        "base_cc",
        "employer_cost",
    ):
        assert result["suggested"][field] is None


# ---------------------------------------------------------------------------
# View — POST /api/payrolls/parse-pdf/
# ---------------------------------------------------------------------------


@pytest.fixture
def user(db):
    return User.objects.create_user(username="parse-user", password="testpass123")


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.mark.django_db
class TestParsePdfView:
    def _upload(self, client, *, content=b"%PDF-fake", text=PAYSLIP_TEXT):
        """Upload `content` as the PDF file, mocking pdfplumber to return `text`."""
        upload = BytesIO(content)
        upload.name = "test.pdf"
        # Patch extract_text so we don't need a real PDF in tests.
        with patch(
            "apps.payroll.services.pdf_parser.extract_text",
            return_value=text,
        ):
            return client.post("/api/payrolls/parse-pdf/", {"file": upload}, format="multipart")

    def test_success_returns_suggested_fields(self, client):
        res = self._upload(client)
        assert res.status_code == 200
        assert res.data["suggested"]["gross"] == "5523.40"
        assert res.data["confidence"] == 1.0

    def test_unrecognised_pdf_returns_422(self, client):
        res = self._upload(client, text="This is just text without payroll terms.")
        assert res.status_code == 422
        assert "PDF no reconocido" in res.data["detail"]

    def test_missing_file_returns_400(self, client):
        res = client.post("/api/payrolls/parse-pdf/", {}, format="multipart")
        assert res.status_code == 400

    def test_anonymous_request_is_rejected(self):
        c = APIClient()
        upload = BytesIO(b"%PDF-fake")
        upload.name = "test.pdf"
        res = c.post("/api/payrolls/parse-pdf/", {"file": upload}, format="multipart")
        assert res.status_code == 401

    def test_pdfplumber_failure_returns_422(self, client):
        upload = BytesIO(b"corrupted")
        upload.name = "test.pdf"
        with patch(
            "apps.payroll.services.pdf_parser.extract_text",
            side_effect=ValueError("invalid PDF"),
        ):
            res = client.post("/api/payrolls/parse-pdf/", {"file": upload}, format="multipart")
        assert res.status_code == 422
