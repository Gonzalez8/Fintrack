from django.urls import path
from . import views

urlpatterns = [
    # JWT auth (primary for SPA)
    path("token/", views.JWTLoginView.as_view(), name="jwt-login"),
    path("token/refresh/", views.JWTRefreshView.as_view(), name="jwt-refresh"),
    path("logout/", views.JWTLogoutView.as_view(), name="logout"),
    path("me/", views.MeView.as_view(), name="me"),
    # Legacy session auth (kept for Django admin)
    path("login/", views.LoginView.as_view(), name="session-login"),
]
