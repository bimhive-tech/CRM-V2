from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
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
from apps.companies.storage import delete_object, upload_company_logo


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


class CompanyLogoUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsPlatformAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        company = generics.get_object_or_404(Company, pk=pk)
        logo_file = request.FILES.get("logo")

        if not logo_file:
            raise ValidationError({"detail": "Logo file is required."})

        previous_key = company.logo_key
        company.logo_key = upload_company_logo(file_obj=logo_file, company_id=company.id)
        company.save(update_fields=["logo_key"])

        if previous_key and previous_key != company.logo_key:
            delete_object(previous_key)

        return Response(CompanySerializer(company).data)

    def delete(self, request, pk):
        company = generics.get_object_or_404(Company, pk=pk)
        previous_key = company.logo_key
        company.logo_key = ""
        company.save(update_fields=["logo_key"])

        if previous_key:
            delete_object(previous_key)

        return Response(CompanySerializer(company).data)


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
