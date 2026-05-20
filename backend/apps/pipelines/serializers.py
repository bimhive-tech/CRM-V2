from rest_framework import serializers

from apps.accounts.models import User
from apps.companies.models import Company
from apps.pipelines.access import pipeline_access_flags
from apps.pipelines.models import Pipeline, PipelineMember, PipelineStatus


class PipelineStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStatus
        fields = ["id", "name", "color", "position", "created_at"]
        read_only_fields = ["id", "created_at"]


class PipelineSerializer(serializers.ModelSerializer):
    statuses = PipelineStatusSerializer(many=True, read_only=True)
    access = serializers.SerializerMethodField()
    company_id = serializers.PrimaryKeyRelatedField(
        source="company",
        queryset=Company.objects.all(),
        write_only=True,
        required=False,
        allow_null=True,
        default=None,
    )

    def get_access(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        return pipeline_access_flags(user, obj)

    class Meta:
        model = Pipeline
        fields = ["id", "name", "kind", "company_id", "statuses", "access", "created_at"]
        read_only_fields = ["id", "created_at", "statuses"]


class PipelineStatusCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineStatus
        fields = ["id", "name", "color", "position", "created_at"]
        read_only_fields = ["id", "position", "created_at"]


class PipelineStatusUpdateSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(required=False, min_value=0)

    class Meta:
        model = PipelineStatus
        fields = ["id", "name", "color", "position", "created_at"]
        read_only_fields = ["id", "created_at"]


class PipelineInviteUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email"]


class PipelineMembershipSerializer(serializers.ModelSerializer):
    user = PipelineInviteUserSerializer(read_only=True)

    class Meta:
        model = PipelineMember
        fields = [
            "id",
            "user",
            "can_invite_members",
            "can_edit_pipeline",
            "can_delete_pipeline",
            "can_manage_statuses",
            "created_at",
        ]
        read_only_fields = fields


class PipelineInviteOptionsSerializer(serializers.Serializer):
    pipelines = PipelineSerializer(many=True)
    users = PipelineInviteUserSerializer(many=True)


class PipelineMembershipBulkAssignSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source="user")
    pipeline_ids = serializers.PrimaryKeyRelatedField(queryset=Pipeline.objects.all(), many=True, source="pipelines")
    can_invite_members = serializers.BooleanField(default=False)
    can_edit_pipeline = serializers.BooleanField(default=False)
    can_delete_pipeline = serializers.BooleanField(default=False)
    can_manage_statuses = serializers.BooleanField(default=False)
