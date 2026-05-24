from rest_framework import serializers

from apps.recordactivity.models import RecordActivity


class RecordActivitySerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()

    class Meta:
        model = RecordActivity
        fields = [
            "id",
            "target_type",
            "kind",
            "title",
            "description",
            "activity_date",
            "is_done",
            "position",
            "created_by",
            "updated_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "target_type", "created_by", "updated_by", "created_at", "updated_at"]

    def get_created_by(self, obj):
        if not obj.created_by_id:
            return None
        return {
            "id": obj.created_by_id,
            "full_name": obj.created_by.full_name,
            "email": obj.created_by.email,
        }

    def get_updated_by(self, obj):
        if not obj.updated_by_id:
            return None
        return {
            "id": obj.updated_by_id,
            "full_name": obj.updated_by.full_name,
            "email": obj.updated_by.email,
        }


class RecordActivityWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecordActivity
        fields = [
            "kind",
            "title",
            "description",
            "activity_date",
            "is_done",
            "position",
        ]
        extra_kwargs = {
            "description": {"required": False, "allow_blank": True},
            "activity_date": {"required": False},
            "is_done": {"required": False},
            "position": {"required": False},
        }

    def validate(self, attrs):
        kind = attrs.get("kind", getattr(self.instance, "kind", ""))
        if kind == RecordActivity.KIND_NOTE:
            attrs["is_done"] = False
        if kind == RecordActivity.KIND_MEETING and not attrs.get("activity_date") and not getattr(self.instance, "activity_date", None):
            raise serializers.ValidationError({"activity_date": "This field is required."})
        return attrs
