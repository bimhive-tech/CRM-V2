from rest_framework import serializers

from apps.accounts.models import User
from apps.crm.models import CRMCompany, CRMContact
from apps.crm.serializers import CRMCompanySummarySerializer
from apps.pipelines.models import Pipeline


class ContactOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email"]


class ContactPipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pipeline
        fields = ["id", "name"]


class ContactSerializer(serializers.ModelSerializer):
    company = CRMCompanySummarySerializer(read_only=True)
    owner = ContactOwnerSerializer(read_only=True)
    pipeline = ContactPipelineSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(source="company", queryset=CRMCompany.objects.all(), write_only=True)
    owner_id = serializers.PrimaryKeyRelatedField(
        source="owner",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )
    pipeline_id = serializers.PrimaryKeyRelatedField(
        source="pipeline",
        queryset=Pipeline.objects.all(),
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
            "pipeline",
            "pipeline_id",
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

    def validate(self, attrs):
        company = attrs.get("company", getattr(self.instance, "company", None))
        pipeline = attrs.get("pipeline", getattr(self.instance, "pipeline", None))

        if pipeline is not None and company is not None and pipeline.company_id != company.tenant_company_id:
            raise serializers.ValidationError({"pipeline_id": "The selected pipeline is not available for this company."})

        return attrs
