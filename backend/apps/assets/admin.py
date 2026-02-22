from django.contrib import admin
from .models import Asset, Account, PortfolioSnapshot, PositionSnapshot, Settings

admin.site.register(Asset)
admin.site.register(Account)
admin.site.register(Settings)
admin.site.register(PortfolioSnapshot)
admin.site.register(PositionSnapshot)
