from rest_framework import status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import import_xlsx


class ImportXlsxView(APIView):
    parser_classes = [MultiPartParser]

    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"detail": "No file provided"}, status=status.HTTP_400_BAD_REQUEST
            )
        if not file.name.endswith(".xlsx"):
            return Response(
                {"detail": "Only .xlsx files are supported"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        dry_run = request.query_params.get("dry_run", "true").lower() == "true"

        try:
            result = import_xlsx(file, dry_run=dry_run)
        except Exception as e:
            return Response(
                {"detail": f"Import failed: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result["dry_run"] = dry_run
        return Response(result)
