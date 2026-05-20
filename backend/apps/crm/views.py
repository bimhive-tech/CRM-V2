from django.db.models import Q
from rest_framework import generics, permissions, serializers

from apps.accounts.permissions import HasAppPermission
from apps.crm.models import CRMCompany
from apps.crm.serializers import CRMCompanySerializer
from config.pagination import StandardResultsSetPagination


def tenant_company_ids_for_user(user):
    ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in ids:
        ids.append(user.company_id)
    return ids


def resolve_default_tenant_company(user):
    if user.company_id:
        return user.company

    first_company = user.companies.order_by("name", "id").first()
    if first_company:
        return first_company

    raise serializers.ValidationError({"detail": "This user is not assigned to a tenant company."})


def crm_companies_queryset_for_user(user):
    queryset = CRMCompany.objects.prefetch_related("contact_links__contact").all()
    if getattr(user, "is_platform_admin", False):
        return queryset.filter(tenant_company_id__in=tenant_company_ids_for_user(user))
    return queryset.filter(tenant_company_id__in=tenant_company_ids_for_user(user))


class CRMCompanyListCreateView(generics.ListCreateAPIView):
    serializer_class = CRMCompanySerializer
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]
    permission_map = {"GET": "crm_companies.view", "POST": "crm_companies.create"}
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = crm_companies_queryset_for_user(self.request.user)
        search = self.request.query_params.get("search", "").strip()

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(industry__icontains=search)
                | Q(owner_name__icontains=search)
                | Q(email__icontains=search)
                | Q(website__icontains=search)
                | Q(linkedin_url__icontains=search)
                | Q(address__icontains=search)
                | Q(address_country__icontains=search)
                | Q(address_state__icontains=search)
                | Q(address_line__icontains=search)
                | Q(phone_number__icontains=search)
                | Q(contact_links__contact__full_name__icontains=search)
                | Q(contact_links__contact__email__icontains=search)
                | Q(contact_links__contact__phone__icontains=search)
            ).distinct()

        return queryset

    def perform_create(self, serializer):
        serializer.save(tenant_company=resolve_default_tenant_company(self.request.user))


class CRMCompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CRMCompanySerializer
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]
    permission_map = {
        "GET": "crm_companies.view",
        "PUT": "crm_companies.update",
        "PATCH": "crm_companies.update",
        "DELETE": "crm_companies.delete",
    }

    def get_queryset(self):
        return crm_companies_queryset_for_user(self.request.user)
