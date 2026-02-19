from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.core.urls")),
    path("api/", include("apps.assets.urls")),
    path("api/", include("apps.transactions.urls")),
    path("api/", include("apps.portfolio.urls")),
    path("api/", include("apps.importer.urls")),
    path("api/", include("apps.reports.urls")),
]
