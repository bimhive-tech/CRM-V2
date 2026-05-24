from rest_framework import serializers

from apps.attachments.models import Attachment


class AttachmentSerializer(serializers.ModelSerializer):
    uploaded_by = serializers.SerializerMethodField()
    source = serializers.SerializerMethodField()

    def get_uploaded_by(self, obj):
        if not obj.uploaded_by_id:
            return None
        return {
            "id": obj.uploaded_by_id,
            "full_name": obj.uploaded_by.full_name,
            "email": obj.uploaded_by.email,
        }

    def get_source(self, obj):
        if obj.contact_id:
            contact_name = getattr(getattr(obj.contact, "contact", None), "full_name", "") or "Contact"
            company_name = getattr(getattr(obj.contact, "company", None), "name", "") or ""
            return {
                "type": obj.TARGET_CONTACT,
                "label": "Contact",
                "name": contact_name,
                "subtitle": company_name,
            }

        if obj.company_id:
            return {
                "type": obj.TARGET_COMPANY,
                "label": "Company",
                "name": getattr(obj.company, "name", "") or "Company",
                "subtitle": "",
            }

        if obj.deal_id:
            return {
                "type": obj.TARGET_DEAL,
                "label": "Project",
                "name": getattr(obj.deal, "name", "") or "Project",
                "subtitle": "",
            }

        return None

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
            "source",
        ]
        read_only_fields = fields
