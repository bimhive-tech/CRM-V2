from rest_framework import serializers

from apps.companies.models import Company
from apps.pipelines.models import Pipeline, PipelineStatus


class PipelineStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStatus
        fields = ["id", "name", "position", "created_at"]
        read_only_fields = ["id", "created_at"]


class PipelineSerializer(serializers.ModelSerializer):
    statuses = PipelineStatusSerializer(many=True, read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Company.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        default=None,
    )

    class Meta:
        model = Pipeline
        fields = ["id", "name", "company_id", "statuses", "created_at"]
        read_only_fields = ["id", "created_at", "statuses"]


class PipelineStatusCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStatus
        fields = ["id", "name", "position", "created_at"]
        read_only_fields = ["id", "position", "created_at"]


class PipelineStatusUpdateSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(required=False, min_value=0)

    class Meta:
        model = PipelineStatus
        fields = ["id", "name", "position", "created_at"]
        read_only_fields = ["id", "created_at"]
