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
    created_by = serializers.SerializerMethodField()
    team = serializers.SerializerMethodField()
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

    def get_created_by(self, obj):
        if not obj.created_by_id:
            return None
        return PipelineUserSummarySerializer(obj.created_by).data

    def get_team(self, obj):
        team = []
        seen_user_ids = set()
        if obj.created_by_id and obj.created_by_id not in seen_user_ids:
            team.append({"id": obj.created_by_id, "full_name": obj.created_by.full_name, "email": obj.created_by.email, "is_creator": True})
            seen_user_ids.add(obj.created_by_id)

        for membership in obj.memberships.select_related("user").all():
            if membership.user_id in seen_user_ids:
                continue
            team.append(
                {
                    "id": membership.user_id,
                    "full_name": membership.user.full_name,
                    "email": membership.user.email,
                    "is_creator": False,
                }
            )
            seen_user_ids.add(membership.user_id)
        return team

    class Meta:
        model = Pipeline
        fields = ["id", "name", "kind", "company_id", "statuses", "access", "created_by", "team", "created_at"]
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


class PipelineUserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email"]


class PipelineMembershipSerializer(serializers.ModelSerializer):
    user = PipelineInviteUserSerializer(read_only=True)
    pipeline = serializers.SerializerMethodField()

    def get_pipeline(self, obj):
        return {
            "id": obj.pipeline_id,
            "name": obj.pipeline.name,
            "kind": obj.pipeline.kind,
        }

    class Meta:
        model = PipelineMember
        fields = [
            "id",
            "pipeline",
            "user",
            "has_full_access",
            "can_invite_members",
            "can_edit_pipeline",
            "can_delete_pipeline",
            "can_manage_statuses",
            "can_view_contacts",
            "can_move_contacts",
            "can_manage_contacts",
            "can_view_companies",
            "can_manage_companies",
            "can_view_deals",
            "can_move_deals",
            "can_manage_deals",
            "created_at",
        ]
        read_only_fields = fields


class PipelineInviteOptionsSerializer(serializers.Serializer):
    pipelines = PipelineSerializer(many=True)
    users = PipelineInviteUserSerializer(many=True)
    accessible_pipeline_count = serializers.IntegerField()


class PipelineMembershipBulkAssignSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), source="user")
    pipeline_ids = serializers.PrimaryKeyRelatedField(queryset=Pipeline.objects.all(), many=True, source="pipelines")
    has_full_access = serializers.BooleanField(default=False)
    can_invite_members = serializers.BooleanField(default=False)
    can_edit_pipeline = serializers.BooleanField(default=False)
    can_delete_pipeline = serializers.BooleanField(default=False)
    can_manage_statuses = serializers.BooleanField(default=False)
    can_view_contacts = serializers.BooleanField(default=False)
    can_move_contacts = serializers.BooleanField(default=False)
    can_manage_contacts = serializers.BooleanField(default=False)
    can_view_companies = serializers.BooleanField(default=False)
    can_manage_companies = serializers.BooleanField(default=False)
    can_view_deals = serializers.BooleanField(default=False)
    can_move_deals = serializers.BooleanField(default=False)
    can_manage_deals = serializers.BooleanField(default=False)


class PipelineMembershipUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineMember
        fields = [
            "has_full_access",
            "can_invite_members",
            "can_edit_pipeline",
            "can_delete_pipeline",
            "can_manage_statuses",
            "can_view_contacts",
            "can_move_contacts",
            "can_manage_contacts",
            "can_view_companies",
            "can_manage_companies",
            "can_view_deals",
            "can_move_deals",
            "can_manage_deals",
        ]
