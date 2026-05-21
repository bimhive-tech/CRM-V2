from django.db import transaction
from django.db.models import Q
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import HasAppPermission
from apps.crm.models import CRMContact, CRMContactCompanyLink
from apps.companies.models import Company
from apps.masterdata.models import PipelineStatusTemplate
from apps.pipelines.access import (
    accessible_pipelines_queryset,
    accessible_pipeline_statuses_queryset,
    company_ids_for_user,
    inviteable_pipelines_queryset,
    normalize_pipeline_member_permissions,
    update_pipeline_membership,
    user_can_delete_pipeline,
    user_can_edit_pipeline,
    user_can_invite_to_pipeline,
    user_can_manage_pipeline_statuses,
)
from apps.pipelines.models import Pipeline, PipelineStatus
from apps.pipelines.serializers import (
    PipelineInviteOptionsSerializer,
    PipelineInviteUserSerializer,
    PipelineMembershipBulkAssignSerializer,
    PipelineMembershipSerializer,
    PipelineMembershipUpdateSerializer,
    PipelineSerializer,
    PipelineStatusCreateSerializer,
    PipelineStatusSerializer,
    PipelineStatusUpdateSerializer,
)


DEFAULT_PIPELINE_STATUS_NAMES = [
    "Lead",
    "Qualified",
    "Proposal",
    "Negotiation",
    "Customer",
]

DEFAULT_PIPELINE_STATUS_COLORS = {
    "Lead": "#8C7A61",
    "Qualified": "#2C7FB8",
    "Proposal": "#C66A1E",
    "Negotiation": "#D18918",
    "Customer": "#3E9B64",
}

def resolve_default_company_for_user(user):
    if user.company_id:
        return user.company

    first_company = user.companies.order_by("name", "id").first()
    if first_company:
        return first_company

    raise serializers.ValidationError({"detail": "This user is not assigned to a company."})


def resolve_requested_company_for_user(user, requested_company=None):
    if requested_company is None:
        return resolve_default_company_for_user(user)

    if getattr(user, "is_platform_admin", False):
        return requested_company

    if requested_company.id in company_ids_for_user(user):
        return requested_company

    raise ValidationError({"detail": "You do not have access to that company."})


def create_default_statuses(pipeline):
    templates = list(
        PipelineStatusTemplate.objects.filter(company=pipeline.company).order_by("position", "id")
    )
    if templates:
        PipelineStatus.objects.bulk_create(
            [
                PipelineStatus(
                    pipeline=pipeline,
                    name=template.name,
                    color=template.color,
                    position=index,
                )
                for index, template in enumerate(templates)
            ]
        )
        return

    PipelineStatus.objects.bulk_create(
        [
            PipelineStatus(
                pipeline=pipeline,
                name=name,
                color=DEFAULT_PIPELINE_STATUS_COLORS.get(name, "#7C5F35"),
                position=index,
            )
            for index, name in enumerate(DEFAULT_PIPELINE_STATUS_NAMES)
        ]
    )


def reorder_pipeline_status(status, next_position):
    siblings = list(status.pipeline.statuses.order_by("position", "id"))
    siblings = [item for item in siblings if item.id != status.id]
    bounded_position = max(0, min(next_position, len(siblings)))
    siblings.insert(bounded_position, status)

    for index, item in enumerate(siblings):
        if item.position != index:
            item.position = index
            item.save(update_fields=["position"])


class PipelineListCreateView(generics.ListCreateAPIView):
    serializer_class = PipelineSerializer
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]
    permission_map = {"POST": "pipelines.create"}

    def get_queryset(self):
        queryset = accessible_pipelines_queryset(self.request.user)
        pipeline_kind = self.request.query_params.get("kind", "").strip()
        if pipeline_kind in {Pipeline.KIND_CONTACTS, Pipeline.KIND_DEALS}:
            queryset = queryset.filter(kind=pipeline_kind)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @transaction.atomic
    def perform_create(self, serializer):
        requested_company = serializer.validated_data.get("company")
        company = resolve_requested_company_for_user(self.request.user, requested_company)
        pipeline = serializer.save(company=company, created_by=self.request.user)
        create_default_statuses(pipeline)


class PipelineDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PipelineSerializer
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]

    def get_queryset(self):
        return accessible_pipelines_queryset(self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        return context

    @transaction.atomic
    def perform_update(self, serializer):
        pipeline = self.get_object()
        if not user_can_edit_pipeline(self.request.user, pipeline):
            raise ValidationError({"detail": "You do not have permission to edit this pipeline."})
        requested_company = serializer.validated_data.get("company")
        if requested_company is None:
            serializer.save()
            return

        serializer.save(company=resolve_requested_company_for_user(self.request.user, requested_company))

    @transaction.atomic
    def perform_destroy(self, instance):
        if not user_can_delete_pipeline(self.request.user, instance):
            raise ValidationError({"detail": "You do not have permission to delete this pipeline."})
        if instance.kind == Pipeline.KIND_CONTACTS:
            CRMContactCompanyLink.objects.filter(pipeline=instance).update(pipeline=None, status="")
            instance.delete()
            return

        from apps.deals.models import Deal

        if Deal.objects.filter(pipeline=instance).exists():
            raise ValidationError({"detail": "Move or delete the deals in this pipeline before removing it."})
        instance.delete()


class PipelineStatusListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]

    def get_queryset(self):
        return accessible_pipeline_statuses_queryset(self.request.user).filter(pipeline_id=self.kwargs["pipeline_pk"])

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PipelineStatusCreateSerializer
        return PipelineStatusSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        pipeline = generics.get_object_or_404(accessible_pipelines_queryset(self.request.user), pk=self.kwargs["pipeline_pk"])
        if not user_can_manage_pipeline_statuses(self.request.user, pipeline):
            raise ValidationError({"detail": "You do not have permission to manage statuses on this pipeline."})
        next_position = pipeline.statuses.count()
        serializer.save(pipeline=pipeline, position=next_position)


class PipelineStatusDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]

    def get_queryset(self):
        return accessible_pipeline_statuses_queryset(self.request.user)

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return PipelineStatusUpdateSerializer
        return PipelineStatusSerializer

    @transaction.atomic
    def perform_update(self, serializer):
        status = self.get_object()
        if not user_can_manage_pipeline_statuses(self.request.user, status.pipeline):
            raise ValidationError({"detail": "You do not have permission to manage statuses on this pipeline."})
        next_position = serializer.validated_data.pop("position", None)
        serializer.save()

        if next_position is not None:
            reorder_pipeline_status(status, next_position)

    @transaction.atomic
    def perform_destroy(self, instance):
        if not user_can_manage_pipeline_statuses(self.request.user, instance.pipeline):
            raise ValidationError({"detail": "You do not have permission to manage statuses on this pipeline."})
        pipeline = instance.pipeline
        instance.delete()
        for index, item in enumerate(pipeline.statuses.order_by("position", "id")):
            if item.position != index:
                item.position = index
                item.save(update_fields=["position"])


class PipelineInviteOptionsView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]
    permission_required = "pipelines.manage_members"

    def get(self, request):
        current_company = resolve_default_company_for_user(request.user)
        inviteable_pipelines = list(
            inviteable_pipelines_queryset(request.user)
            .filter(company=current_company)
            .order_by("kind", "name", "id")
        )
        accessible_pipeline_count = accessible_pipelines_queryset(request.user).filter(company=current_company).count()
        users_queryset = (
            request.user.__class__.objects.filter(
                Q(company=current_company) | Q(companies=current_company)
            )
            .exclude(id=request.user.id)
            .distinct()
            .prefetch_related("roles")
            .order_by("full_name", "email")
        )
        serializer = PipelineInviteOptionsSerializer(
            {
                "pipelines": inviteable_pipelines,
                "users": users_queryset,
                "accessible_pipeline_count": accessible_pipeline_count,
            },
            context={"request": request},
        )
        return Response(serializer.data)


class PipelineMembershipBulkAssignView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]
    permission_required = "pipelines.manage_members"
    serializer_class = PipelineMembershipBulkAssignSerializer

    @transaction.atomic
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user = serializer.validated_data["user"]
        pipelines = serializer.validated_data["pipelines"]
        permissions_payload = {
            "has_full_access": serializer.validated_data["has_full_access"],
            "can_invite_members": serializer.validated_data["can_invite_members"],
            "can_edit_pipeline": serializer.validated_data["can_edit_pipeline"],
            "can_delete_pipeline": serializer.validated_data["can_delete_pipeline"],
            "can_manage_statuses": serializer.validated_data["can_manage_statuses"],
            "can_view_contacts": serializer.validated_data["can_view_contacts"],
            "can_move_contacts": serializer.validated_data["can_move_contacts"],
            "can_manage_contacts": serializer.validated_data["can_manage_contacts"],
            "can_view_companies": serializer.validated_data["can_view_companies"],
            "can_manage_companies": serializer.validated_data["can_manage_companies"],
            "can_view_deals": serializer.validated_data["can_view_deals"],
            "can_move_deals": serializer.validated_data["can_move_deals"],
            "can_manage_deals": serializer.validated_data["can_manage_deals"],
        }

        target_company_ids = set(target_user.companies.values_list("id", flat=True))
        if target_user.company_id:
            target_company_ids.add(target_user.company_id)

        updated = []
        skipped_pipeline_ids = []
        for pipeline in pipelines:
            if pipeline.company_id not in target_company_ids:
                raise ValidationError({"user_id": "The selected user does not belong to one or more selected pipeline companies."})
            if not user_can_invite_to_pipeline(request.user, pipeline):
                raise ValidationError({"pipeline_ids": f"You do not have permission to invite members to {pipeline.name}."})
            if pipeline.memberships.filter(user=target_user).exists():
                skipped_pipeline_ids.append(pipeline.id)
                continue
            updated.append(update_pipeline_membership(pipeline, target_user, permissions_payload))

        return Response(
            {
                "updated_count": len(updated),
                "skipped_pipeline_ids": skipped_pipeline_ids,
                "pipelines": PipelineSerializer(pipelines, many=True, context={"request": request}).data,
                "user": PipelineInviteUserSerializer(target_user).data,
            }
        )


class PipelineMembershipListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]
    permission_required = "pipelines.manage_members"
    serializer_class = PipelineMembershipSerializer

    def get_queryset(self):
        queryset = (
            PipelineMembershipSerializer.Meta.model.objects.select_related("pipeline", "user", "pipeline__company")
            .prefetch_related("user__roles")
            .filter(pipeline__in=inviteable_pipelines_queryset(self.request.user))
            .order_by("pipeline__kind", "pipeline__name", "user__full_name", "user__email")
        )
        pipeline_id = self.request.query_params.get("pipeline_id", "").strip()
        if pipeline_id:
            queryset = queryset.filter(pipeline_id=pipeline_id)
        return queryset


class PipelineMembershipDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]
    permission_required = "pipelines.manage_members"
    serializer_class = PipelineMembershipUpdateSerializer

    def get_queryset(self):
        return (
            PipelineMembershipUpdateSerializer.Meta.model.objects.select_related("pipeline", "user")
            .filter(pipeline__in=inviteable_pipelines_queryset(self.request.user))
        )

    def perform_update(self, serializer):
        membership = self.get_object()
        if not user_can_invite_to_pipeline(self.request.user, membership.pipeline):
            raise ValidationError({"detail": "You do not have permission to manage members on this pipeline."})
        merged_permissions = {
            "has_full_access": serializer.validated_data.get("has_full_access", membership.has_full_access),
            "can_invite_members": serializer.validated_data.get("can_invite_members", membership.can_invite_members),
            "can_edit_pipeline": serializer.validated_data.get("can_edit_pipeline", membership.can_edit_pipeline),
            "can_delete_pipeline": serializer.validated_data.get("can_delete_pipeline", membership.can_delete_pipeline),
            "can_manage_statuses": serializer.validated_data.get("can_manage_statuses", membership.can_manage_statuses),
            "can_view_contacts": serializer.validated_data.get("can_view_contacts", membership.can_view_contacts),
            "can_move_contacts": serializer.validated_data.get("can_move_contacts", membership.can_move_contacts),
            "can_manage_contacts": serializer.validated_data.get("can_manage_contacts", membership.can_manage_contacts),
            "can_view_companies": serializer.validated_data.get("can_view_companies", membership.can_view_companies),
            "can_manage_companies": serializer.validated_data.get("can_manage_companies", membership.can_manage_companies),
            "can_view_deals": serializer.validated_data.get("can_view_deals", membership.can_view_deals),
            "can_move_deals": serializer.validated_data.get("can_move_deals", membership.can_move_deals),
            "can_manage_deals": serializer.validated_data.get("can_manage_deals", membership.can_manage_deals),
        }
        serializer.save(**normalize_pipeline_member_permissions(merged_permissions))

    def perform_destroy(self, instance):
        if not user_can_invite_to_pipeline(self.request.user, instance.pipeline):
            raise ValidationError({"detail": "You do not have permission to manage members on this pipeline."})
        instance.delete()
