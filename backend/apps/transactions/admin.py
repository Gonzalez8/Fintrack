from django.contrib import admin
from .models import Transaction, Dividend, Interest

admin.site.register(Transaction)
admin.site.register(Dividend)
admin.site.register(Interest)
