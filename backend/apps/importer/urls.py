from django.urls import path
from . import views

urlpatterns = [
    path("import/xlsx/", views.ImportXlsxView.as_view(), name="import-xlsx"),
]
