from django.urls import path

from . import views

urlpatterns = [
    path(
        "properties/",
        views.PropertyViewSet.as_view({"get": "list", "post": "create"}),
        name="property-list",
    ),
    path(
        "properties/simulate/",
        views.MortgageSimulationView.as_view(),
        name="mortgage-simulation",
    ),
    path(
        "properties/<uuid:pk>/",
        views.PropertyViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="property-detail",
    ),
    path(
        "amortizations/",
        views.AmortizationViewSet.as_view({"get": "list", "post": "create"}),
        name="amortization-list",
    ),
    path(
        "amortizations/<uuid:pk>/",
        views.AmortizationViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="amortization-detail",
    ),
]
