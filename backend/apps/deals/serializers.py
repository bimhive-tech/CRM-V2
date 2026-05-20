from django.utils import timezone
from rest_framework import serializers

from apps.crm.models import CRMCompany, CRMContactCompanyLink
from apps.deals.models import Deal
from apps.pipelines.models import Pipeline


def calculate_stage_probability(pipeline, stage_name):
    statuses = list(pipeline.statuses.order_by("position", "id").values_list("name", flat=True))
    if not statuses:
        return 0
    if len(statuses) == 1:
        return 100
    try:
        index = statuses.index(stage_name)
    except ValueError:
        return 0
    return round((index / (len(statuses) - 1)) * 100)


class DealCompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = CRMCompany
        fields = ["id", "name"]


class DealContactSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="contact.full_name", read_only=True)
    title = serializers.CharField(read_only=True)
    email = serializers.EmailField(source="contact.email", read_only=True)

    class Meta:
        model = CRMContactCompanyLink
        fields = ["id", "full_name", "title", "email"]


class DealOwnerSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()


class DealSerializer(serializers.ModelSerializer):
    company = DealCompanySerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(source="company", queryset=CRMCompany.objects.all())
    contact = DealContactSerializer(source="contact_link", read_only=True)
    contact_id = serializers.PrimaryKeyRelatedField(
        source="contact_link",
        queryset=CRMContactCompanyLink.objects.select_related("contact", "company"),
        required=False,
        allow_null=True,
    )
    pipeline_name = serializers.CharField(source="pipeline.name", read_only=True)
    pipeline_id = serializers.PrimaryKeyRelatedField(source="pipeline", queryset=Pipeline.objects.all())
    owner = serializers.SerializerMethodField()
    stage_color = serializers.SerializerMethodField()
    days_in_stage = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = [
            "id",
            "name",
            "company",
            "company_id",
            "contact",
            "contact_id",
            "pipeline_id",
            "pipeline_name",
            "owner",
            "stage",
            "stage_color",
            "amount",
            "probability",
            "expected_close_date",
            "days_in_stage",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "pipeline_name", "owner", "stage_color", "probability", "days_in_stage", "created_at", "updated_at"]

    def get_owner(self, obj):
        if not obj.owner:
            return None
        return {
            "id": obj.owner_id,
            "full_name": obj.owner.full_name,
            "email": obj.owner.email,
        }

    def get_stage_color(self, obj):
        status = obj.pipeline.statuses.filter(name=obj.stage).first()
        return status.color if status else "#7C5F35"

    def get_days_in_stage(self, obj):
        if not obj.stage_entered_at:
            return 0
        delta = timezone.now() - obj.stage_entered_at
        return max(delta.days, 0)

    def validate(self, attrs):
        company = attrs.get("company", getattr(self.instance, "company", None))
        contact_link = attrs.get("contact_link", getattr(self.instance, "contact_link", None))
        pipeline = attrs.get("pipeline", getattr(self.instance, "pipeline", None))
        stage = attrs.get("stage", getattr(self.instance, "stage", ""))

        if company is None:
            raise serializers.ValidationError({"company_id": "Company is required."})
        if pipeline is None:
            raise serializers.ValidationError({"pipeline_id": "Pipeline is required."})
        if pipeline.company_id != company.tenant_company_id:
            raise serializers.ValidationError({"pipeline_id": "The selected pipeline is not available for this company."})
        if pipeline.kind != Pipeline.KIND_DEALS:
            raise serializers.ValidationError({"pipeline_id": "The selected pipeline is not a deals pipeline."})
        if contact_link and contact_link.company_id != company.id:
            raise serializers.ValidationError({"contact_id": "The selected contact does not belong to this company."})

        available_stages = set(pipeline.statuses.values_list("name", flat=True))
        if stage and available_stages and stage not in available_stages:
            raise serializers.ValidationError({"stage": "The selected stage is not available in this pipeline."})

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        validated_data["tenant_company"] = validated_data["company"].tenant_company
        validated_data["probability"] = calculate_stage_probability(validated_data["pipeline"], validated_data.get("stage", ""))
        if request and request.user.is_authenticated and "owner" not in validated_data:
            validated_data["owner"] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        previous_stage = instance.stage
        pipeline = validated_data.get("pipeline", instance.pipeline)
        stage = validated_data.get("stage", instance.stage)
        validated_data["probability"] = calculate_stage_probability(pipeline, stage)
        deal = super().update(instance, validated_data)
        if "stage" in validated_data and validated_data["stage"] != previous_stage:
            deal.stage_entered_at = timezone.now()
            deal.save(update_fields=["stage_entered_at", "updated_at"])
        return deal
