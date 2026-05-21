from django.db.models import Q
from rest_framework import generics, permissions, serializers

from apps.auditlog.models import AuditLogEntry
from apps.auditlog.services import log_audit_event
from apps.deals.models import Deal
from apps.pipelines.access import (
    accessible_pipelines_queryset,
    pipelines_with_deal_visibility_queryset,
    user_can_manage_pipeline_deals,
    user_can_move_pipeline_deals,
    user_can_view_pipeline_deals,
)
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
        has_global_view = self.request.user.has_app_permission("deals.view")
        visible_pipelines = pipelines_with_deal_visibility_queryset(self.request.user)
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
            pipeline = generics.get_object_or_404(accessible_pipelines_queryset(self.request.user), pk=pipeline_id)
            if not has_global_view and not user_can_view_pipeline_deals(self.request.user, pipeline):
                raise serializers.ValidationError({"detail": "You do not have permission to view deals in this pipeline."})
            queryset = queryset.filter(pipeline_id=pipeline_id)
        elif not has_global_view and not (self.request.user.is_platform_admin or self.request.user.is_company_admin):
            queryset = queryset.filter(pipeline__in=visible_pipelines).distinct()
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        if stage:
            queryset = queryset.filter(stage=stage)

        return queryset

    def perform_create(self, serializer):
        pipeline = serializer.validated_data.get("pipeline")
        if not self.request.user.has_app_permission("deals.create"):
            if pipeline is None or not user_can_manage_pipeline_deals(self.request.user, pipeline):
                raise serializers.ValidationError({"detail": "You do not have permission to create deals here."})
        deal = serializer.save()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_DEAL,
            action=AuditLogEntry.ACTION_CREATE,
            title="Created deal",
            description=deal.name,
            target=deal,
            company=deal.tenant_company,
            metadata={"pipeline_name": deal.pipeline.name, "stage": deal.stage},
        )


class DealDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = deals_queryset_for_user(self.request.user)
        if self.request.user.is_platform_admin or self.request.user.is_company_admin or self.request.user.has_app_permission("deals.view"):
            return queryset
        visible_pipelines = pipelines_with_deal_visibility_queryset(self.request.user)
        return queryset.filter(pipeline__in=visible_pipelines).distinct()

    def perform_update(self, serializer):
        instance = self.get_object()
        target_pipeline = serializer.validated_data.get("pipeline", instance.pipeline)
        if not self.request.user.has_app_permission("deals.update"):
            update_fields = set(self.request.data.keys())
            stage_only_fields = {"stage", "pipeline_id"}
            if update_fields and update_fields.issubset(stage_only_fields):
                if target_pipeline is None or not user_can_move_pipeline_deals(self.request.user, target_pipeline):
                    raise serializers.ValidationError({"detail": "You do not have permission to move deals in this pipeline."})
            elif target_pipeline is None or not user_can_manage_pipeline_deals(self.request.user, target_pipeline):
                raise serializers.ValidationError({"detail": "You do not have permission to update this deal."})
        deal = serializer.save()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_DEAL,
            action=AuditLogEntry.ACTION_UPDATE,
            title="Updated deal",
            description=deal.name,
            target=deal,
            company=deal.tenant_company,
            metadata={"pipeline_name": deal.pipeline.name, "stage": deal.stage},
        )

    def perform_destroy(self, instance):
        if not self.request.user.has_app_permission("deals.delete"):
            if instance.pipeline is None or not user_can_manage_pipeline_deals(self.request.user, instance.pipeline):
                raise serializers.ValidationError({"detail": "You do not have permission to delete this deal."})
        deal_name = instance.name
        company = instance.tenant_company
        deal_ref = instance
        instance.delete()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_DEAL,
            action=AuditLogEntry.ACTION_DELETE,
            title="Deleted deal",
            description=deal_name,
            target=deal_ref,
            company=company,
        )
