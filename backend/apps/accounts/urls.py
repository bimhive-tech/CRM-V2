from django.urls import path

from apps.accounts.views import LoginView, MeView, RoleDetailView, RoleListCreateView, UserDetailView, UserListCreateView


urlpatterns = [
    path("login/", LoginView.as_view(), name="login"),
    path("me/", MeView.as_view(), name="me"),
    path("roles/", RoleListCreateView.as_view(), name="roles"),
    path("roles/<int:pk>/", RoleDetailView.as_view(), name="role-detail"),
    path("users/", UserListCreateView.as_view(), name="users"),
    path("users/<int:pk>/", UserDetailView.as_view(), name="user-detail"),
]
