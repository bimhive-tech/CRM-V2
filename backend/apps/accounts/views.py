from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.models import Role, User
from apps.accounts.permissions import CanAccessSettings, IsPlatformAdmin
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
from apps.masterdata.defaults import initialize_company_master_data


class LoginView(TokenObtainPairView):
    serializer_class = CRMTokenObtainPairSerializer


def company_ids_for_user(user):
    company_ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in company_ids:
        company_ids.append(user.company_id)
    return company_ids


def company_queryset_for_user(user):
    queryset = Company.objects.all()
    if user.is_platform_admin:
        return queryset
    return queryset.filter(id__in=company_ids_for_user(user))


def user_queryset_for_settings(user):
    queryset = user_queryset()
    if user.is_platform_admin:
        return queryset
    return queryset.filter(companies__id__in=company_ids_for_user(user)).distinct()


def role_queryset_for_settings(user):
    queryset = Role.objects.select_related("company").all()
    if user.is_platform_admin:
        return queryset
    return queryset.filter(company_id__in=company_ids_for_user(user), is_system=False)


def resolve_default_company_for_user(user):
    company = user.company or user.companies.order_by("name", "id").first()
    if company:
        return company
    raise ValidationError({"detail": "This user is not assigned to a company."})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class CompanyListCreateView(generics.ListCreateAPIView):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        return company_queryset_for_user(self.request.user)

    def perform_create(self, serializer):
        if not self.request.user.is_platform_admin:
            raise ValidationError({"detail": "Only platform admins can create companies."})
        company = serializer.save()
        initialize_company_master_data(company)


class CompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        return company_queryset_for_user(self.request.user)

    def perform_destroy(self, instance):
        if not self.request.user.is_platform_admin:
            raise ValidationError({"detail": "Only platform admins can delete companies."})
        instance.delete()


class CompanyLogoUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        company = generics.get_object_or_404(company_queryset_for_user(request.user), pk=pk)
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
        company = generics.get_object_or_404(company_queryset_for_user(request.user), pk=pk)
        previous_key = company.logo_key
        company.logo_key = ""
        company.save(update_fields=["logo_key"])

        if previous_key:
            delete_object(previous_key)

        return Response(CompanySerializer(company).data)


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        return user_queryset_for_settings(self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminUserCreateSerializer
        return UserSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        return user_queryset_for_settings(self.request.user)

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return AdminUserUpdateSerializer
        return UserSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context


class RoleListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        return role_queryset_for_settings(self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminRoleCreateUpdateSerializer
        return RoleSerializer

    def perform_create(self, serializer):
        if self.request.user.is_platform_admin:
            serializer.save()
            return

        serializer.save(company=resolve_default_company_for_user(self.request.user))


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        return role_queryset_for_settings(self.request.user)

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return AdminRoleCreateUpdateSerializer
        return RoleSerializer

    def perform_destroy(self, instance):
        if instance.is_system:
            raise ValidationError({"detail": "System roles cannot be deleted."})
        instance.delete()
