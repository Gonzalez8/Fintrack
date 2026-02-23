import os

from django.apps import AppConfig


class AssetsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.assets"

    def ready(self):
        # RUN_MAIN=true is set by Django's auto-reloader (runserver) in the server
        # process, and by entrypoint.sh before starting Gunicorn (production).
        # This guard prevents the scheduler from starting in management commands
        # (migrate, shell, etc.) and in tests.
        if os.environ.get("RUN_MAIN") != "true":
            return

        from .scheduler import start
        start()
