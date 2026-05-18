from rest_framework import generics, permissions, serializers

from apps.crm.models import CRMCompany
from apps.crm.serializers import CRMCompanySerializer


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
    queryset = CRMCompany.objects.prefetch_related("contacts").all()
    if getattr(user, "is_platform_admin", False):
        return queryset.filter(tenant_company_id__in=tenant_company_ids_for_user(user))
    return queryset.filter(tenant_company_id__in=tenant_company_ids_for_user(user))


class CRMCompanyListCreateView(generics.ListCreateAPIView):
    serializer_class = CRMCompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return crm_companies_queryset_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.save(tenant_company=resolve_default_tenant_company(self.request.user))


class CRMCompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CRMCompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return crm_companies_queryset_for_user(self.request.user)
