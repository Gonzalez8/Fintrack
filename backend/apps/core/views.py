from django.conf import settings as django_settings
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken


def _set_refresh_cookie(response, refresh_token_str):
    """Attach refresh token as httpOnly cookie to `response`."""
    response.set_cookie(
        key=django_settings.JWT_REFRESH_COOKIE_NAME,
        value=refresh_token_str,
        httponly=django_settings.JWT_REFRESH_COOKIE_HTTPONLY,
        samesite=django_settings.JWT_REFRESH_COOKIE_SAMESITE,
        secure=getattr(django_settings, "JWT_REFRESH_COOKIE_SECURE", False),
        max_age=int(django_settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        path="/",
    )


def _delete_refresh_cookie(response):
    """Remove the refresh token cookie."""
    response.delete_cookie(
        key=django_settings.JWT_REFRESH_COOKIE_NAME,
        path="/",
    )


# ---------------------------------------------------------------------------
# JWT endpoints (primary auth for the SPA)
# ---------------------------------------------------------------------------

class JWTLoginView(APIView):
    """POST /api/auth/token/ — authenticate and issue access + refresh tokens.

    Returns:
        Body:   { access: str, user: { id, username } }
        Cookie: refresh_token (httpOnly, SameSite=Lax)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "Credenciales incorrectas."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)
        response = Response({
            "access": str(refresh.access_token),
            "user": {"id": user.pk, "username": user.username},
        })
        _set_refresh_cookie(response, str(refresh))
        return response


class JWTRefreshView(APIView):
    """POST /api/auth/token/refresh/ — rotate refresh token using httpOnly cookie.

    Delegates to TokenRefreshSerializer which handles ROTATE_REFRESH_TOKENS
    and BLACKLIST_AFTER_ROTATION automatically.

    Returns:
        Body:   { access: str }
        Cookie: refresh_token (rotated when ROTATE_REFRESH_TOKENS=True)
    """
    permission_classes = [AllowAny]

    def post(self, request):
        raw_token = request.COOKIES.get(django_settings.JWT_REFRESH_COOKIE_NAME)
        if not raw_token:
            return Response(
                {"detail": "Refresh token no encontrado."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={"refresh": raw_token})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken) as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        data = serializer.validated_data
        response = Response({"access": data["access"]})

        # When ROTATE_REFRESH_TOKENS=True, serializer returns a new refresh token.
        if "refresh" in data:
            _set_refresh_cookie(response, data["refresh"])

        return response


class JWTLogoutView(APIView):
    """POST /api/auth/logout/ — blacklist refresh token and clear httpOnly cookie."""

    def post(self, request):
        raw_token = request.COOKIES.get(django_settings.JWT_REFRESH_COOKIE_NAME)
        if raw_token:
            try:
                RefreshToken(raw_token).blacklist()
            except (TokenError, InvalidToken):
                pass  # Already invalid — still clear the cookie

        response = Response({"detail": "Sesión cerrada."})
        _delete_refresh_cookie(response)
        return response


# ---------------------------------------------------------------------------
# Shared auth endpoint
# ---------------------------------------------------------------------------

class MeView(APIView):
    """GET /api/auth/me/ — return current authenticated user (JWT or session)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "id": request.user.pk,
            "username": request.user.username,
        })


# ---------------------------------------------------------------------------
# Celery task status
# ---------------------------------------------------------------------------

class TaskStatusView(APIView):
    """GET /api/tasks/{task_id}/ — poll a Celery task result.

    Returns:
        { task_id, status }                          while PENDING / STARTED
        { task_id, status, result }                  on SUCCESS
        { task_id, status, error }                   on FAILURE
    """

    def get(self, request, task_id: str):
        from celery.result import AsyncResult
        result = AsyncResult(task_id)
        data: dict = {"task_id": task_id, "status": result.status}
        if result.ready():
            if result.successful():
                data["result"] = result.result
            else:
                data["error"] = str(result.result)
        return Response(data)


# ---------------------------------------------------------------------------
# Legacy session endpoints (kept for Django /admin/ compatibility)
# ---------------------------------------------------------------------------

@method_decorator(ensure_csrf_cookie, name="dispatch")
class LoginView(APIView):
    """Legacy session-based login used by Django admin.
    New SPA clients should use JWTLoginView (POST /api/auth/token/).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"detail": "CSRF cookie set"})

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        return Response({"id": user.pk, "username": user.username})
