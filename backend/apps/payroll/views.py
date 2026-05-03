from rest_framework import viewsets

from apps.core.mixins import OwnedByUserMixin

from .filters import EmployerFilter, PayrollFilter
from .models import Employer, Payroll
from .serializers import EmployerSerializer, PayrollSerializer


class EmployerViewSet(OwnedByUserMixin, viewsets.ModelViewSet):
    queryset = Employer.objects.all()
    serializer_class = EmployerSerializer
    filterset_class = EmployerFilter
    ordering_fields = ["name", "created_at"]


class PayrollViewSet(OwnedByUserMixin, viewsets.ModelViewSet):
    queryset = Payroll.objects.select_related("employer").all()
    serializer_class = PayrollSerializer
    filterset_class = PayrollFilter
    ordering_fields = ["period_end", "gross", "net", "irpf_withholding"]
