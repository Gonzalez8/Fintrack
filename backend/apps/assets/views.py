from rest_framework import viewsets, status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Asset, Account, Settings
from .serializers import AssetSerializer, AccountSerializer, SettingsSerializer
from .services import update_prices


class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    search_fields = ["name", "ticker"]
    ordering_fields = ["name", "ticker", "type"]

    def destroy(self, request, *args, **kwargs):
        from django.db.models import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar este activo porque tiene operaciones o dividendos asociados."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class UpdatePricesView(APIView):
    def post(self, request):
        try:
            result = update_prices()
        except Exception as e:
            return Response(
                {"detail": f"Price update failed: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(result)


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer

    def destroy(self, request, *args, **kwargs):
        from django.db.models import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "No se puede eliminar esta cuenta porque tiene operaciones o intereses asociados."},
                status=status.HTTP_400_BAD_REQUEST,
            )


class SettingsView(RetrieveUpdateAPIView):
    serializer_class = SettingsSerializer

    def get_object(self):
        return Settings.load()
