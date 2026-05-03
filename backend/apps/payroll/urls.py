from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("employers", views.EmployerViewSet)
router.register("payrolls", views.PayrollViewSet)

urlpatterns = [
    path("", include(router.urls)),
]
