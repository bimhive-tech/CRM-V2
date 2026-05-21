from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.auditlog.models import AuditLogEntry
from apps.auditlog.services import log_audit_event
from apps.accounts.models import Role, User
from apps.accounts.permission_catalog import get_visible_permission_groups
from apps.accounts.permissions import CanAccessSettings, HasAppPermission
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

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code < 400:
            user = User.objects.filter(email__iexact=request.data.get("email", "")).first()
            if user is not None:
                log_audit_event(
                    user,
                    event_type=AuditLogEntry.TYPE_AUTH,
                    action=AuditLogEntry.ACTION_LOGIN,
                    title="Signed in",
                    description="Started a new CRM session.",
                )
        return response


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
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings, HasAppPermission]
    permission_map = {"GET": "settings.access", "POST": "companies.create"}

    def get_queryset(self):
        return company_queryset_for_user(self.request.user)

    def perform_create(self, serializer):
        if not self.request.user.is_platform_admin:
            raise ValidationError({"detail": "Only platform admins can create companies."})
        company = serializer.save()
        initialize_company_master_data(company)
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_COMPANY,
            action=AuditLogEntry.ACTION_CREATE,
            title="Created company",
            description=company.name,
            target=company,
            company=company,
        )


class CompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        return company_queryset_for_user(self.request.user)

    def retrieve(self, request, *args, **kwargs):
        if request.user.is_platform_admin:
            if not request.user.has_app_permission("companies.view"):
                raise ValidationError({"detail": "You do not have permission to view companies."})
        elif not request.user.has_app_permission("company_profile.view"):
            raise ValidationError({"detail": "You do not have permission to view company info."})
        return super().retrieve(request, *args, **kwargs)

    def perform_update(self, serializer):
        company = self.get_object()
        if self.request.user.is_platform_admin:
            if not self.request.user.has_app_permission("companies.update"):
                raise ValidationError({"detail": "You do not have permission to update companies."})
        else:
            if company.id not in company_ids_for_user(self.request.user):
                raise ValidationError({"detail": "You do not have access to that company."})
            if not self.request.user.has_app_permission("company_profile.update"):
                raise ValidationError({"detail": "You do not have permission to update company info."})
        serializer.save()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_COMPANY,
            action=AuditLogEntry.ACTION_UPDATE,
            title="Updated company",
            description=company.name,
            target=company,
            company=company,
        )

    def perform_destroy(self, instance):
        if not self.request.user.is_platform_admin:
            raise ValidationError({"detail": "Only platform admins can delete companies."})
        if not self.request.user.has_app_permission("companies.delete"):
            raise ValidationError({"detail": "You do not have permission to delete companies."})
        company_name = instance.name
        company_ref = instance
        instance.delete()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_COMPANY,
            action=AuditLogEntry.ACTION_DELETE,
            title="Deleted company",
            description=company_name,
            target=company_ref,
            company=self.request.user.company or self.request.user.companies.order_by("name", "id").first(),
        )


class CompanyLogoUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        company = generics.get_object_or_404(company_queryset_for_user(request.user), pk=pk)
        if request.user.is_platform_admin:
            if not request.user.has_app_permission("companies.update"):
                raise ValidationError({"detail": "You do not have permission to update companies."})
        elif not request.user.has_app_permission("company_profile.upload_logo"):
            raise ValidationError({"detail": "You do not have permission to manage the company logo."})
        logo_file = request.FILES.get("logo")

        if not logo_file:
            raise ValidationError({"detail": "Logo file is required."})

        previous_key = company.logo_key
        company.logo_key = upload_company_logo(file_obj=logo_file, company_id=company.id)
        company.save(update_fields=["logo_key"])
        log_audit_event(
            request.user,
            event_type=AuditLogEntry.TYPE_COMPANY,
            action=AuditLogEntry.ACTION_UPDATE,
            title="Updated company logo",
            description=company.name,
            target=company,
            company=company,
        )

        if previous_key and previous_key != company.logo_key:
            delete_object(previous_key)

        return Response(CompanySerializer(company).data)

    def delete(self, request, pk):
        company = generics.get_object_or_404(company_queryset_for_user(request.user), pk=pk)
        if request.user.is_platform_admin:
            if not request.user.has_app_permission("companies.update"):
                raise ValidationError({"detail": "You do not have permission to update companies."})
        elif not request.user.has_app_permission("company_profile.upload_logo"):
            raise ValidationError({"detail": "You do not have permission to manage the company logo."})
        previous_key = company.logo_key
        company.logo_key = ""
        company.save(update_fields=["logo_key"])

        if previous_key:
            delete_object(previous_key)

        log_audit_event(
            request.user,
            event_type=AuditLogEntry.TYPE_COMPANY,
            action=AuditLogEntry.ACTION_UPDATE,
            title="Removed company logo",
            description=company.name,
            target=company,
            company=company,
        )
        return Response(CompanySerializer(company).data)


class UserListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings, HasAppPermission]
    permission_map = {"GET": "users.view", "POST": "users.create"}

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

    def perform_create(self, serializer):
        user = serializer.save()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_USER,
            action=AuditLogEntry.ACTION_CREATE,
            title="Created user",
            description=user.full_name or user.email,
            target=user,
            company=user.company or self.request.user.company,
        )


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings, HasAppPermission]
    permission_map = {
        "GET": "users.view",
        "PUT": "users.update",
        "PATCH": "users.update",
        "DELETE": "users.delete",
    }

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

    def perform_update(self, serializer):
        user = serializer.save()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_USER,
            action=AuditLogEntry.ACTION_UPDATE,
            title="Updated user",
            description=user.full_name or user.email,
            target=user,
            company=user.company or self.request.user.company,
        )

    def perform_destroy(self, instance):
        user_name = instance.full_name or instance.email
        company = instance.company or self.request.user.company
        user_ref = instance
        instance.delete()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_USER,
            action=AuditLogEntry.ACTION_DELETE,
            title="Deleted user",
            description=user_name,
            target=user_ref,
            company=company,
        )


class RoleListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings, HasAppPermission]
    permission_map = {"GET": "roles.view", "POST": "roles.create"}

    def get_queryset(self):
        return role_queryset_for_settings(self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminRoleCreateUpdateSerializer
        return RoleSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_create(self, serializer):
        if self.request.user.is_platform_admin:
            role = serializer.save()
            log_audit_event(
                self.request.user,
                event_type=AuditLogEntry.TYPE_ROLE,
                action=AuditLogEntry.ACTION_CREATE,
                title="Created role",
                description=role.name,
                target=role,
            )
            return

        role = serializer.save(company=resolve_default_company_for_user(self.request.user))
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_ROLE,
            action=AuditLogEntry.ACTION_CREATE,
            title="Created role",
            description=role.name,
            target=role,
            company=role.company,
        )


class RoleDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings, HasAppPermission]
    permission_map = {
        "GET": "roles.view",
        "PUT": "roles.update",
        "PATCH": "roles.update",
        "DELETE": "roles.delete",
    }

    def get_queryset(self):
        return role_queryset_for_settings(self.request.user)

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return AdminRoleCreateUpdateSerializer
        return RoleSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    def perform_update(self, serializer):
        role = serializer.save()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_ROLE,
            action=AuditLogEntry.ACTION_UPDATE,
            title="Updated role",
            description=role.name,
            target=role,
            company=role.company or self.request.user.company,
        )

    def perform_destroy(self, instance):
        if instance.is_system:
            raise ValidationError({"detail": "System roles cannot be deleted."})
        role_name = instance.name
        company = instance.company or self.request.user.company
        role_ref = instance
        instance.delete()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_ROLE,
            action=AuditLogEntry.ACTION_DELETE,
            title="Deleted role",
            description=role_name,
            target=role_ref,
            company=company,
        )


class PermissionCatalogView(APIView):
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings, HasAppPermission]
    permission_required = "settings.access"

    def get(self, request):
        return Response({"groups": get_visible_permission_groups(request.user)})
