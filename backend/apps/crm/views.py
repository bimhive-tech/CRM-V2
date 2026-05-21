from django.db.models import Q
from rest_framework import generics, permissions, serializers

from apps.crm.models import CRMCompany
from apps.crm.serializers import CRMCompanySerializer
from apps.pipelines.access import (
    pipelines_with_company_visibility_queryset,
    pipelines_with_contact_visibility_queryset,
    pipelines_with_deal_visibility_queryset,
    user_can_manage_pipeline_companies,
)
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
    queryset = queryset.filter(tenant_company_id__in=tenant_company_ids_for_user(user))
    if getattr(user, "is_company_admin", False) or user.has_app_permission("crm_companies.view"):
        return queryset
    company_visible_pipelines = pipelines_with_company_visibility_queryset(user)
    contact_visible_pipelines = pipelines_with_contact_visibility_queryset(user)
    deal_visible_pipelines = pipelines_with_deal_visibility_queryset(user)
    return queryset.filter(
        Q(contact_links__pipeline__in=company_visible_pipelines)
        | Q(contacts__pipeline__in=company_visible_pipelines)
        | Q(deals__pipeline__in=company_visible_pipelines)
        | Q(contact_links__pipeline__in=contact_visible_pipelines)
        | Q(contacts__pipeline__in=contact_visible_pipelines)
        | Q(deals__pipeline__in=deal_visible_pipelines)
    ).distinct()


class CRMCompanyListCreateView(generics.ListCreateAPIView):
    serializer_class = CRMCompanySerializer
    permission_classes = [permissions.IsAuthenticated]
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
        if not self.request.user.has_app_permission("crm_companies.create"):
            if not pipelines_with_company_visibility_queryset(self.request.user).filter(
                Q(created_by=self.request.user) | Q(memberships__user=self.request.user, memberships__has_full_access=True) | Q(memberships__user=self.request.user, memberships__can_manage_companies=True)
            ).exists():
                raise serializers.ValidationError({"detail": "You do not have permission to create CRM companies."})
        serializer.save(tenant_company=resolve_default_tenant_company(self.request.user))


class CRMCompanyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CRMCompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return crm_companies_queryset_for_user(self.request.user)

    def _can_manage_company(self, company):
        if self.request.user.is_platform_admin or self.request.user.is_company_admin or self.request.user.has_app_permission("crm_companies.update"):
            return True
        manageable_pipelines = pipelines_with_company_visibility_queryset(self.request.user)
        for pipeline in manageable_pipelines:
            if user_can_manage_pipeline_companies(self.request.user, pipeline) and (
                company.contact_links.filter(pipeline=pipeline).exists()
                or company.contacts.filter(pipeline=pipeline).exists()
                or company.deals.filter(pipeline=pipeline).exists()
            ):
                return True
        return False

    def perform_update(self, serializer):
        if not self._can_manage_company(self.get_object()):
            raise serializers.ValidationError({"detail": "You do not have permission to update this company."})
        serializer.save()

    def perform_destroy(self, instance):
        if not self._can_manage_company(instance):
            raise serializers.ValidationError({"detail": "You do not have permission to delete this company."})
        instance.delete()
