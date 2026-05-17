from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.models import Role, User
from apps.accounts.permissions import IsPlatformAdmin
from apps.accounts.serializers import (
    AdminRoleCreateUpdateSerializer,
    AdminUserCreateSerializer,
    AdminUserUpdateSerializer,
    CRMTokenObtainPairSerializer,
    RoleSerializer,
    UserSerializer,
)
from apps.accounts.services import user_queryset
from apps.companies.models import Company
from apps.companies.serializers import CompanySerializer


class LoginView(TokenObtainPairView):
    serializer_class = CRMTokenObtainPairSerializer


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class CompanyListCreateView(generics.ListCreateAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]


class CompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]


class UserListCreateView(generics.ListCreateAPIView):
    queryset = user_queryset()
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminUserCreateSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = user_queryset()
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return AdminUserUpdateSerializer
        return UserSerializer


class RoleListCreateView(generics.ListCreateAPIView):
    queryset = Role.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminRoleCreateUpdateSerializer
        return RoleSerializer


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Role.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return AdminRoleCreateUpdateSerializer
        return RoleSerializer

    def perform_destroy(self, instance):
        if instance.is_system:
            raise ValidationError({"detail": "System roles cannot be deleted."})
        instance.delete()
