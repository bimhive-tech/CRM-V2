from django.db import transaction
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import ValidationError

from apps.companies.models import Company
from apps.pipelines.models import Pipeline, PipelineStatus
from apps.pipelines.serializers import (
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


def company_ids_for_user(user):
    ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in ids:
        ids.append(user.company_id)
    return ids


def pipelines_queryset_for_user(user):
    queryset = Pipeline.objects.select_related("company").prefetch_related("statuses")
    if getattr(user, "is_platform_admin", False):
        return queryset
    return queryset.filter(company_id__in=company_ids_for_user(user))


def pipeline_statuses_queryset_for_user(user):
    queryset = PipelineStatus.objects.select_related("pipeline", "pipeline__company")
    if getattr(user, "is_platform_admin", False):
        return queryset
    return queryset.filter(pipeline__company_id__in=company_ids_for_user(user))


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
    PipelineStatus.objects.bulk_create(
        [
            PipelineStatus(pipeline=pipeline, name=name, position=index)
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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return pipelines_queryset_for_user(self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        requested_company = serializer.validated_data.get("company")
        company = resolve_requested_company_for_user(self.request.user, requested_company)
        pipeline = serializer.save(company=company)
        create_default_statuses(pipeline)


class PipelineDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PipelineSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return pipelines_queryset_for_user(self.request.user)

    @transaction.atomic
    def perform_update(self, serializer):
        requested_company = serializer.validated_data.get("company")
        if requested_company is None:
            serializer.save()
            return

        serializer.save(company=resolve_requested_company_for_user(self.request.user, requested_company))


class PipelineStatusListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return pipeline_statuses_queryset_for_user(self.request.user).filter(pipeline_id=self.kwargs["pipeline_pk"])

    def get_serializer_class(self):
        if self.request.method == "POST":
            return PipelineStatusCreateSerializer
        return PipelineStatusSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        pipeline = generics.get_object_or_404(pipelines_queryset_for_user(self.request.user), pk=self.kwargs["pipeline_pk"])
        next_position = pipeline.statuses.count()
        serializer.save(pipeline=pipeline, position=next_position)


class PipelineStatusDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return pipeline_statuses_queryset_for_user(self.request.user)

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return PipelineStatusUpdateSerializer
        return PipelineStatusSerializer

    @transaction.atomic
    def perform_update(self, serializer):
        status = self.get_object()
        next_position = serializer.validated_data.pop("position", None)
        serializer.save()

        if next_position is not None:
            reorder_pipeline_status(status, next_position)

    @transaction.atomic
    def perform_destroy(self, instance):
        pipeline = instance.pipeline
        instance.delete()
        for index, item in enumerate(pipeline.statuses.order_by("position", "id")):
            if item.position != index:
                item.position = index
                item.save(update_fields=["position"])
