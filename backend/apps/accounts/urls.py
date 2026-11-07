from django.urls import path

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

from .views import (
    UserRegistrationView,
    UserProfileView,
    LogoutView,
)


urlpatterns = [
    path(
        "register/",
        UserRegistrationView.as_view(),
        name="register",
    ),

    path(
        "login/",
        TokenObtainPairView.as_view(),
        name="login",
    ),

    path(
        "token/refresh/",
        TokenRefreshView.as_view(),
        name="token-refresh",
    ),

    path(
        "token/verify/",
        TokenVerifyView.as_view(),
        name="token-verify",
    ),

    path(
        "profile/",
        UserProfileView.as_view(),
        name="profile",
    ),

    path(
        "logout/",
        LogoutView.as_view(),
        name="logout",
    ),
]