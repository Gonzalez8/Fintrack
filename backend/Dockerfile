FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM base AS development
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY . .

FROM base AS production
COPY . .
RUN python manage.py collectstatic --noinput 2>/dev/null || true
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
