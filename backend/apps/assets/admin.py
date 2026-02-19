from django.contrib import admin
from .models import Asset, Account, Settings

admin.site.register(Asset)
admin.site.register(Account)
admin.site.register(Settings)
