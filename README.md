# Fintrack

Personal investment tracking application. Monitor your portfolio, transactions, dividends, interests and taxes from a single interface.

## Features

- **Dashboard** with total net worth, asset distribution, yearly income and historical evolution charts
- **Portfolio** with current positions, unrealized P&L and price updates via Yahoo Finance
- **Transactions** for buy, sell and gift operations with automatic FIFO cost basis
- **Dividends** and **interests** with withholding tax details
- **Tax report** — yearly summary ready for tax filing (capital gains, investment income)
- **Excel import** from spreadsheet with duplicate detection
- **Full backup/restore** in JSON
- **Dark mode**

## Tech Stack

| Layer | Technologies |
|---|---|
| Backend | Django 5.1, Django REST Framework, PostgreSQL 16, yfinance, openpyxl |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), React Query, Zustand, Recharts |
| Infra | Docker Compose |

## Quick Start

```bash
git clone <repo-url> && cd Fintrack
cp .env.example .env          # adjust if needed
docker compose up              # starts db, backend and frontend
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000/api/ |
| Django Admin | http://localhost:8000/admin/ |

Default user: `admin` / `admin`

## Project Structure

```
backend/                Django 5.1 + DRF
  apps/
    core/               Auth (session + CSRF cookies)
    assets/             Asset, Account, Settings + Yahoo Finance
    transactions/       Transaction (BUY/SELL/GIFT), Dividend, Interest
    portfolio/          FIFO engine (positions, realized P&L)
    importer/           Excel import
    reports/            Yearly tax summaries
  config/
    settings/           base.py, development.py
    urls.py

frontend/               Vite + React 18 + TypeScript
  src/
    api/                Axios clients (CSRF interceptor)
    pages/              Dashboard, Cartera, Activos, Cuentas,
                        Operaciones, Dividendos, Intereses,
                        Fiscal, Configuracion
    components/
      ui/               shadcn/ui (Radix + Tailwind)
      app/              Sidebar, PageHeader, DataTable, MoneyCell
    stores/             Zustand (authStore)
    types/              TypeScript interfaces
    lib/                Shared utilities and constants
```

## Common Commands

```bash
# Migrations
docker compose exec backend python manage.py makemigrations <app>
docker compose exec backend python manage.py migrate

# Django shell
docker compose exec backend python manage.py shell

# Tests
docker compose exec backend pytest

# TypeScript check
docker compose exec frontend npx tsc --noEmit
```

## API

```
POST   /api/auth/login/            Login (session)
POST   /api/auth/logout/           Logout
GET    /api/auth/me/               Current user

CRUD   /api/assets/                Assets
POST   /api/assets/update-prices/  Fetch prices (Yahoo Finance)
CRUD   /api/accounts/              Accounts
GET/PUT /api/settings/             Settings (singleton)

CRUD   /api/transactions/          Transactions
CRUD   /api/dividends/             Dividends
CRUD   /api/interests/             Interests

GET    /api/portfolio/             Positions + realized sales (FIFO)
GET    /api/reports/yearly/        Year-by-year income summary
POST   /api/import/xlsx/           Excel import (?dry_run=true)
GET    /api/export/transactions.csv  CSV export
```

## Environment Variables

Copy `.env.example` to `.env` and adjust:

```
DB_NAME=fintrack
DB_USER=fintrack
DB_PASSWORD=changeme
DB_HOST=db
DB_PORT=5432
DJANGO_SECRET_KEY=change-me-to-a-random-string
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,backend
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## License

Personal project. All rights reserved.
