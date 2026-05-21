from rest_framework import serializers

from apps.attachments.models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.SerializerMethodField()

    def get_uploaded_by(self, obj):
        if not obj.uploaded_by_id:
            return None
        return {
            "id": obj.uploaded_by_id,
            "full_name": obj.uploaded_by.full_name,
            "email": obj.uploaded_by.email,
        }

    class Meta:
        model = Attachment
        fields = [
            "id",
            "target_type",
            "original_name",
            "content_type",
            "file_size",
            "created_at",
            "uploaded_by",
        ]
        read_only_fields = fields

