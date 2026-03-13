<div align="center">

# Fintrack 2.0

**Personal investment tracking platform — Pro architecture**

Track your portfolio, dividends, interests, and savings with real-time price updates,
multi-method cost basis calculations, and comprehensive tax reporting.

[![Django](https://img.shields.io/badge/Django-5.1-092E20?logo=django)](https://www.djangoproject.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docs.docker.com/compose/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## Features

### Portfolio Management
- **Multi-asset support** — Stocks, ETFs, Funds, Crypto
- **Real-time pricing** — Automatic updates via Yahoo Finance
- **Cost basis engines** — FIFO, LIFO, and Weighted Average Cost (WAC)
- **Position tracking** — Unrealized P&L, cost basis, market value per position

### Transaction Tracking
- **Buy / Sell / Gift** transactions with commission and tax support
- **Dividend tracking** — Gross, tax, net, withholding rate per asset
- **Interest income** — Date-range based tracking per account
- **Import deduplication** — Hash-based duplicate detection

### Accounts & Snapshots
- **Multiple account types** — Operativa, Ahorro, Inversion, Depositos, Alternativos
- **Balance snapshots** — Historical balance tracking with auto-sync
- **Portfolio snapshots** — Periodic automated snapshots via Celery Beat

### Reports & Analytics
- **Year summary** — Dividends, interests, realized P&L, total income by year
- **Patrimonio evolution** — Total net worth over time (cash + investments)
- **Portfolio evolution** — Market value, cost basis, unrealized P&L charts
- **Monthly savings** — Cashflow and savings rate analysis
- **CSV exports** — Transactions, dividends, and interests

### Data Management
- **Full JSON backup/restore** — Export and import all user data
- **Data retention policies** — Configurable automatic purge of old snapshots
- **Per-user settings** — Currency, cost basis method, rounding, price source

### Security & Auth
- **JWT in httpOnly cookies** — Access + refresh tokens, SameSite=Lax
- **Google OAuth 2.0** — One-click login with automatic account creation
- **Rate limiting** — Per-endpoint throttling (login, register, password change)
- **Multi-tenancy** — Strict owner-based data isolation
- **Cross-ownership validation** — FK fields validated against requesting user

### Internationalization
- **5 languages** — Spanish, English, German, French, Italian
- **Locale detection** — Automatic from browser, persisted in cookie

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/)

### 1. Clone & configure

```bash
git clone https://github.com/your-username/fintrack2.0.git
cd fintrack2.0
cp .env.example .env
# Edit .env with your values (see Environment Variables below)
```

### 2. Start all services

```bash
docker compose up
```

### 3. Create a superuser (optional)

```bash
docker compose exec backend python manage.py createsuperuser
```

### 4. Access the application

| Service        | URL                         |
| -------------- | --------------------------- |
| Frontend       | http://localhost:3000        |
| Backend API    | http://localhost:8000/api/   |
| Django Admin   | http://localhost:8000/admin/ |
| API Docs       | http://localhost:8000/api/schema/swagger-ui/ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  Next.js 16 │  SSR + Streaming
                    │  Port 3000  │  Route Handlers (BFF)
                    └──────┬──────┘
                           │  HTTP (internal network)
                    ┌──────▼──────┐
                    │  Django 5.1 │  REST API
                    │  Port 8000  │  JWT Auth
                    └──┬─────┬───┘
                       │     │
              ┌────────▼┐  ┌─▼────────┐
              │ Postgres │  │  Redis   │
              │   :5432  │  │  :6379   │
              └──────────┘  └─┬────┬───┘
                              │    │
                    ┌─────────▼┐ ┌─▼──────────┐
                    │  Celery  │ │ Celery Beat │
                    │  Worker  │ │  Scheduler  │
                    └──────────┘ └─────────────┘
```

### BFF Pattern

The browser **never** calls the Django API directly. All requests flow through Next.js Route Handlers (`/api/proxy/*`), which:
1. Read JWT from httpOnly cookies
2. Forward the request to Django with the Authorization header
3. Handle token refresh transparently
4. Return the response to the browser

### Rendering Strategy

| Route Group    | Strategy           | Description                        |
| -------------- | ------------------ | ---------------------------------- |
| `(marketing)/` | SSG                | Landing page, static generation    |
| `(auth)/`      | Client Components  | Login, Register forms              |
| `(dashboard)/` | SSR + Streaming    | Server Components + React Suspense |

---

## Tech Stack

### Backend

| Technology            | Version | Purpose                          |
| --------------------- | ------- | -------------------------------- |
| Django                | 5.1     | Web framework                    |
| Django REST Framework | 3.15    | API layer                        |
| PostgreSQL            | 16      | Primary database                 |
| Redis                 | 7       | Cache + Celery broker            |
| Celery                | 5.3     | Async task queue                 |
| SimpleJWT             | 5.3     | JWT authentication               |
| yfinance              | 0.2     | Yahoo Finance price fetching     |
| drf-spectacular       | 0.28    | OpenAPI documentation            |
| Gunicorn              | 23      | Production WSGI server           |
| WhiteNoise            | 6       | Static file serving              |

### Frontend

| Technology         | Version | Purpose                          |
| ------------------ | ------- | -------------------------------- |
| Next.js            | 16      | React framework (App Router)     |
| React              | 19      | UI library                       |
| TypeScript         | 5       | Type safety                      |
| Tailwind CSS       | 4       | Utility-first CSS                |
| Radix UI / Base UI | —       | Accessible UI primitives         |
| TanStack Query     | 5       | Server state management          |
| Recharts           | 3       | Data visualization               |
| Lightweight Charts | 5       | Financial charts                 |
| Lucide React       | —       | Icon library                     |
| MSW                | 2       | API mocking (demo mode)          |

---

## Project Structure

```
fintrack2.0/
├── backend/                       Django 5.1 + DRF
│   ├── apps/
│   │   ├── core/                  JWT auth, base models, health check
│   │   │   ├── models.py          TimeStampedModel, UserOwnedModel
│   │   │   ├── views.py           Login, Register, Google OAuth, Profile
│   │   │   ├── authentication.py  CookieJWTAuthentication
│   │   │   └── serializers.py     Auth serializers
│   │   ├── assets/                Assets, accounts, snapshots, settings
│   │   │   ├── models.py          Asset, Account, AccountSnapshot, Settings
│   │   │   ├── views.py           CRUD ViewSets + price update trigger
│   │   │   ├── services.py        Yahoo Finance integration
│   │   │   └── tasks.py           Celery: price updates, snapshots, purge
│   │   ├── transactions/          Financial transactions
│   │   │   ├── models.py          Transaction, Dividend, Interest
│   │   │   ├── views.py           CRUD ViewSets
│   │   │   └── serializers.py     Ownership validation + serialization
│   │   ├── portfolio/             Cost basis calculation engine
│   │   │   └── services.py        FIFO, LIFO, WAC algorithms
│   │   ├── reports/               Analytics & exports
│   │   │   ├── services.py        Year summary, evolution, savings
│   │   │   └── views.py           Report endpoints + CSV exports
│   │   └── importer/              Backup & restore
│   │       ├── views.py           JSON export/import (50MB limit)
│   │       └── serializers.py     Backup serializers
│   └── config/
│       ├── settings/
│       │   ├── base.py            Shared settings
│       │   ├── development.py     Dev overrides
│       │   └── production.py      Security hardening (HSTS, SSL, etc.)
│       ├── urls.py                Root URL configuration
│       └── celery.py              Celery app configuration
│
├── frontend/                      Next.js 16 App Router
│   └── src/
│       ├── app/
│       │   ├── (marketing)/       Landing page (SSG)
│       │   ├── (auth)/            Login, Register (Client Components)
│       │   ├── (dashboard)/       Protected pages (SSR + Streaming)
│       │   │   ├── assets/        Asset management + detail view
│       │   │   ├── accounts/      Account management + snapshots
│       │   │   ├── transactions/  Buy/Sell/Gift entries
│       │   │   ├── dividends/     Dividend tracking
│       │   │   ├── interests/     Interest income
│       │   │   ├── tax/           Tax reports
│       │   │   ├── savings/       Savings analytics
│       │   │   ├── profile/       User profile + password
│       │   │   └── settings/      App settings
│       │   └── api/               BFF Route Handlers (proxy to Django)
│       ├── components/
│       │   ├── ui/                shadcn/ui (Radix + Tailwind v4)
│       │   └── app/               Domain-specific components
│       ├── lib/                   api-server.ts, api-client.ts, utils
│       ├── types/                 TypeScript interfaces
│       ├── demo/                  Static demo data + MSW handlers
│       └── i18n/                  Translations (es, en, de, fr, it)
│
├── docker-compose.yml             6 services orchestration
├── .env.example                   Environment variable template
└── CLAUDE.md                      AI assistant instructions
```

---

## API Reference

### Authentication

| Method | Endpoint                     | Description              | Auth     |
| ------ | ---------------------------- | ------------------------ | -------- |
| POST   | `/api/auth/token/`           | Login (JWT)              | Public   |
| POST   | `/api/auth/token/refresh/`   | Refresh access token     | Cookie   |
| POST   | `/api/auth/logout/`          | Logout + blacklist token | Auth     |
| GET    | `/api/auth/me/`              | Current user info        | Auth     |
| POST   | `/api/auth/register/`        | Create account           | Public   |
| POST   | `/api/auth/google/`          | Google OAuth login       | Public   |
| GET/PUT| `/api/auth/profile/`         | User profile             | Auth     |
| POST   | `/api/auth/change-password/` | Change password          | Auth     |

### Assets & Accounts

| Method       | Endpoint                     | Description                |
| ------------ | ---------------------------- | -------------------------- |
| GET/POST     | `/api/assets/`               | List / create assets       |
| GET/PUT/DEL  | `/api/assets/{id}/`          | Asset CRUD                 |
| POST         | `/api/assets/update-prices/` | Trigger price update       |
| GET/POST     | `/api/accounts/`             | List / create accounts     |
| GET/PUT/DEL  | `/api/accounts/{id}/`        | Account CRUD               |
| POST         | `/api/accounts/bulk-snapshot/` | Bulk snapshot balances   |
| GET/POST     | `/api/account-snapshots/`    | Account balance snapshots  |
| GET/PUT      | `/api/settings/`             | User settings              |

### Transactions

| Method       | Endpoint                  | Description                  |
| ------------ | ------------------------- | ---------------------------- |
| GET/POST     | `/api/transactions/`      | List / create transactions   |
| GET/PUT/DEL  | `/api/transactions/{id}/` | Transaction CRUD             |
| GET/POST     | `/api/dividends/`         | List / create dividends      |
| GET/PUT/DEL  | `/api/dividends/{id}/`    | Dividend CRUD                |
| GET/POST     | `/api/interests/`         | List / create interests      |
| GET/PUT/DEL  | `/api/interests/{id}/`    | Interest CRUD                |

### Portfolio & Reports

| Method | Endpoint                          | Description                       |
| ------ | --------------------------------- | --------------------------------- |
| GET    | `/api/portfolio/`                 | Current portfolio with positions  |
| GET    | `/api/reports/year-summary/`      | Annual income breakdown           |
| GET    | `/api/reports/patrimonio-evolution/` | Net worth over time            |
| GET    | `/api/reports/rv-evolution/`      | Portfolio value evolution          |
| GET    | `/api/reports/monthly-savings/`   | Monthly savings rate              |
| GET    | `/api/reports/snapshot-status/`   | Snapshot health status            |

### Exports & Backup

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| GET    | `/api/export/transactions.csv` | Download transactions CSV      |
| GET    | `/api/export/dividends.csv`    | Download dividends CSV         |
| GET    | `/api/export/interests.csv`    | Download interests CSV         |
| GET    | `/api/backup/export/`          | Full JSON backup               |
| POST   | `/api/backup/import/`          | Restore from JSON backup       |

### System

| Method | Endpoint               | Description          |
| ------ | ---------------------- | -------------------- |
| GET    | `/api/health/`         | Health check         |
| GET    | `/api/tasks/{task_id}/`| Celery task status   |

---

## Database Schema

### Core Models

```
TimeStampedModel (abstract)
├── id: UUID (primary key)
├── created_at: DateTime
└── updated_at: DateTime

UserOwnedModel (abstract, extends TimeStampedModel)
└── owner: FK → User
```

### Asset Models

```
Asset (UserOwnedModel)
├── name, ticker, isin
├── type: STOCK | ETF | FUND | CRYPTO
├── currency: CharField (default EUR)
├── current_price: Decimal(20,6)
├── price_mode: MANUAL | AUTO
├── price_source: YAHOO | MANUAL
├── price_status: OK | ERROR | NO_TICKER
├── issuer_country, domicile_country, withholding_country
└── Unique: (owner, ticker), (owner, isin)

Account (UserOwnedModel)
├── name, currency, balance
├── type: OPERATIVA | AHORRO | INVERSION | DEPOSITOS | ALTERNATIVOS
└── Unique: (owner, name)

AccountSnapshot (UserOwnedModel)
├── account: FK → Account
├── date, balance, note
└── Unique: (account, date)  — auto-syncs Account.balance
```

### Transaction Models

```
Transaction (UserOwnedModel)
├── asset: FK → Asset
├── account: FK → Account (nullable)
├── date, type: BUY | SELL | GIFT
├── quantity: Decimal(20,6), price: Decimal(20,6)
├── commission, tax: Decimal(20,2)
└── Unique: (owner, import_hash)

Dividend (UserOwnedModel)
├── asset: FK → Asset
├── date, shares, gross, tax, net
├── withholding_rate: Decimal(5,2)
└── Unique: (owner, import_hash)

Interest (UserOwnedModel)
├── account: FK → Account
├── date_start, date_end
├── gross, net, balance
└── Unique: (owner, import_hash)
```

### Snapshot Models

```
PortfolioSnapshot
├── owner: FK → User
├── captured_at, batch_id: UUID
└── total_market_value, total_cost, total_unrealized_pnl

PositionSnapshot
├── owner: FK → User
├── batch_id, captured_at
├── asset: FK → Asset
├── quantity, cost_basis, market_value
├── unrealized_pnl, unrealized_pnl_pct
└── Unique: (batch_id, asset)
```

### Settings

```
Settings (OneToOne → User)
├── base_currency, cost_basis_method, fiscal_cost_method
├── gift_cost_mode: ZERO | MARKET
├── rounding_money (2), rounding_qty (6)
├── price_update_interval (minutes)
├── snapshot_frequency (minutes, default 1440)
├── data_retention_days (nullable)
└── purge_portfolio_snapshots, purge_position_snapshots
```

---

## Environment Variables

| Variable               | Default                      | Description                              |
| ---------------------- | ---------------------------- | ---------------------------------------- |
| `DJANGO_SECRET_KEY`    | `insecure-dev-key-change-me` | Django secret key (MUST change in prod)  |
| `DEBUG`                | `True`                       | Debug mode                               |
| `ALLOWED_HOSTS`        | `localhost,127.0.0.1,backend`| Comma-separated allowed hosts            |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000`      | Comma-separated CORS origins             |
| `DB_NAME`              | `fintrack`                   | PostgreSQL database name                 |
| `DB_USER`              | `fintrack`                   | PostgreSQL user                          |
| `DB_PASSWORD`          | `changeme`                   | PostgreSQL password                      |
| `DB_HOST`              | `db`                         | PostgreSQL host                          |
| `DB_PORT`              | `5432`                       | PostgreSQL port                          |
| `REDIS_URL`            | `redis://redis:6379/0`       | Redis connection URL                     |
| `ALLOW_REGISTRATION`   | `true`                       | Enable/disable user registration         |
| `GOOGLE_CLIENT_ID`     | (empty)                      | Google OAuth client ID                   |
| `DJANGO_INTERNAL_URL`  | `http://backend:8000`        | Django URL for Next.js (internal)        |
| `NEXT_PUBLIC_DEMO_MODE`| `false`                      | Enable demo mode (MSW mocks)            |
| `NEXT_PUBLIC_API_URL`  | `http://localhost:8000`      | Public API URL                           |

---

## Development

### Running the full stack

```bash
docker compose up          # Start all 6 services
docker compose up -d       # Start in detached mode
docker compose logs -f     # Follow logs
```

### Backend commands

```bash
# Django management
docker compose exec backend python manage.py makemigrations <app>
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py shell

# Run tests
docker compose exec backend pytest
docker compose exec backend pytest apps/portfolio/tests/ -v

# Check code
docker compose exec backend python manage.py check --deploy
```

### Frontend commands

```bash
# Inside the frontend container
docker compose exec frontend npm run dev
docker compose exec frontend npm run build
docker compose exec frontend npm run lint
```

### Celery tasks

The following tasks run automatically via Celery Beat:

| Task                        | Schedule  | Description                             |
| --------------------------- | --------- | --------------------------------------- |
| `snapshot_all_users_task`   | Every 60s | Create portfolio snapshots when due     |
| `purge_old_snapshots_task`  | Daily     | Delete snapshots past retention period  |

On-demand tasks (triggered via API):

| Task                  | Trigger                        | Description               |
| --------------------- | ------------------------------ | ------------------------- |
| `update_prices_task`  | `POST /api/assets/update-prices/` | Fetch prices from Yahoo |

---

## Production Deployment

### Security settings (automatic in production.py)

- `DEBUG = False`
- `DJANGO_SECRET_KEY` must be set (raises RuntimeError otherwise)
- `JWT_AUTH_COOKIE_SECURE = True`
- `SECURE_HSTS_SECONDS = 31536000` (1 year)
- `SECURE_SSL_REDIRECT = True`
- `SESSION_COOKIE_SECURE = True`
- `CSRF_COOKIE_SECURE = True`

### Checklist

- [ ] Set a strong `DJANGO_SECRET_KEY`
- [ ] Set `DEBUG=False`
- [ ] Set `DB_PASSWORD` to a secure value
- [ ] Configure `ALLOWED_HOSTS` and `CORS_ALLOWED_ORIGINS`
- [ ] Set `CSRF_TRUSTED_ORIGINS` for your domain
- [ ] Configure `GOOGLE_CLIENT_ID` if using Google login
- [ ] Set `ALLOW_REGISTRATION=false` if single-user
- [ ] Set up SSL termination (nginx, Caddy, or cloud LB)
- [ ] Configure backup strategy for PostgreSQL
- [ ] Monitor Redis memory usage

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Conventions

- **UI labels** in Spanish, **code** (variables, comments) in English
- **Money**: Always `Decimal`, never `float`
- **IDs**: UUID via `TimeStampedModel`
- **Multi-tenancy**: Every model has `owner` FK, ViewSets use `OwnedByUserMixin`
- **BFF Pattern**: Browser → Next.js → Django (browser never calls Django directly)

---

## License

[MIT](LICENSE)
