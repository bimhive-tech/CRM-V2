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

    def validate(self, attrs):
        kind = attrs.get("kind", getattr(self.instance, "kind", ""))
        if kind == RecordActivity.KIND_NOTE:
            attrs["is_done"] = False
        return attrs

