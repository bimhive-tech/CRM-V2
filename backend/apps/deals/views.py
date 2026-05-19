from django.db.models import Q
from rest_framework import generics, permissions, serializers

from apps.deals.models import Deal
from apps.deals.serializers import DealSerializer
from config.pagination import StandardResultsSetPagination


def company_ids_for_user(user):
    ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in ids:
        ids.append(user.company_id)
    return ids


def deals_queryset_for_user(user):
    queryset = Deal.objects.select_related("tenant_company", "company", "contact_link__contact", "contact_link__company", "pipeline", "owner").prefetch_related("pipeline__statuses")
    if getattr(user, "is_platform_admin", False):
        return queryset.filter(tenant_company_id__in=company_ids_for_user(user))
    return queryset.filter(tenant_company_id__in=company_ids_for_user(user))


class DealListCreateView(generics.ListCreateAPIView):
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = deals_queryset_for_user(self.request.user)
        search = self.request.query_params.get("search", "").strip()
        pipeline_id = self.request.query_params.get("pipeline_id", "").strip()
        company_id = self.request.query_params.get("company_id", "").strip()
        stage = self.request.query_params.get("stage", "").strip()

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(company__name__icontains=search)
                | Q(contact_link__contact__full_name__icontains=search)
                | Q(owner__full_name__icontains=search)
            )
        if pipeline_id:
            queryset = queryset.filter(pipeline_id=pipeline_id)
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        if stage:
            queryset = queryset.filter(stage=stage)

        return queryset

    def perform_create(self, serializer):
        serializer.save()


class DealDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return deals_queryset_for_user(self.request.user)

