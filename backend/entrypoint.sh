#!/bin/sh
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Creating superuser if needed..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
User = get_user_model()
username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin')
if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(username, '', password)
    print(f'Superuser \"{username}\" created.')
else:
    print(f'Superuser \"{username}\" already exists, skipping.')
"

# RUN_MAIN=true allows the Django scheduler to start under Gunicorn
# (the same env var that Django's auto-reloader sets in the server process)
export RUN_MAIN=true

echo "Starting server..."
exec "$@"
