from rest_framework import serializers

from apps.accounts.models import User
from apps.crm.models import CRMCompany, CRMContact
from apps.crm.serializers import CRMCompanySummarySerializer


class ContactOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email"]


class ContactSerializer(serializers.ModelSerializer):
    company = CRMCompanySummarySerializer(read_only=True)
    owner = ContactOwnerSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(source="company", queryset=CRMCompany.objects.all(), write_only=True)
    owner_id = serializers.PrimaryKeyRelatedField(
        source="owner",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )

    class Meta:
        model = CRMContact
        fields = [
            "id",
            "full_name",
            "title",
            "email",
            "phone",
            "company",
            "company_id",
            "owner",
            "owner_id",
            "status",
            "notes",
            "last_touch",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_status(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Status is required.")
        return cleaned
