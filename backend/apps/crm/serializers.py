from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User
from apps.crm.models import CRMCompany, CRMContact, CRMContactCompanyLink
from apps.pipelines.models import Pipeline
from apps.pipelines.access import user_can_access_pipeline
from apps.pipelines.stage_history import create_stage_history_entry, ensure_stage_history, resolve_stage_color, serialize_stage_history, transition_stage_history


def normalize_optional_url(value):
    cleaned = (value or "").strip()
    if not cleaned:
        return ""
    if cleaned.startswith("www."):
        return f"https://{cleaned}"
    if not cleaned.startswith(("http://", "https://")):
        return f"https://{cleaned}"
    return cleaned


class CRMCompanySummarySerializer(serializers.ModelSerializer):
    tenant_company_id = serializers.IntegerField(read_only=True)
    website = serializers.CharField(allow_blank=True, required=False)
    linkedin_url = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = CRMCompany
        fields = [
            "id",
            "tenant_company_id",
            "name",
            "industry",
            "owner_name",
            "email",
            "phone_number",
            "phone_numbers",
            "website",
            "linkedin_url",
            "social_links",
            "address",
            "address_country",
            "address_state",
            "address_line",
            "latitude",
            "longitude",
            "employee_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_website(self, value):
        return normalize_optional_url(value)

    def validate_linkedin_url(self, value):
        return normalize_optional_url(value)

    def validate_social_links(self, value):
        cleaned_links = []
        for item in value or []:
            platform = str(item.get("platform", "")).strip()
            url = normalize_optional_url(item.get("url", ""))
            if not platform or not url:
                continue
            cleaned_links.append({"platform": platform, "url": url})
        return cleaned_links


class CRMCompanyContactSummarySerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="contact.full_name", read_only=True)
    email = serializers.CharField(source="contact.email", read_only=True)
    phone = serializers.CharField(source="contact.phone", read_only=True)
    phone_numbers = serializers.ListField(source="contact.phone_numbers", read_only=True)
    stage_color = serializers.SerializerMethodField()
    stage_history = serializers.SerializerMethodField()

    class Meta:
        model = CRMContactCompanyLink
        fields = ["id", "full_name", "title", "email", "phone", "phone_numbers", "status", "stage_color", "stage_history"]

    def get_stage_color(self, obj):
        return resolve_stage_color(obj.pipeline, obj.status)

    def get_stage_history(self, obj):
        return serialize_stage_history(ensure_stage_history(obj.stage_history, pipeline=obj.pipeline, stage_name=obj.status, started_at=obj.stage_entered_at))


class CRMCompanySerializer(serializers.ModelSerializer):
    tenant_company_id = serializers.IntegerField(read_only=True)
    website = serializers.CharField(allow_blank=True, required=False)
    linkedin_url = serializers.CharField(allow_blank=True, required=False)
    contacts = CRMCompanyContactSummarySerializer(source="contact_links", many=True, read_only=True)

    class Meta:
        model = CRMCompany
        fields = [
            "id",
            "tenant_company_id",
            "name",
            "industry",
            "owner_name",
            "email",
            "phone_number",
            "phone_numbers",
            "website",
            "linkedin_url",
            "social_links",
            "address",
            "address_country",
            "address_state",
            "address_line",
            "latitude",
            "longitude",
            "employee_count",
            "contacts",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "contacts"]

    def validate_website(self, value):
        return normalize_optional_url(value)

    def validate_linkedin_url(self, value):
        return normalize_optional_url(value)

    def validate_social_links(self, value):
        cleaned_links = []
        for item in value or []:
            platform = str(item.get("platform", "")).strip()
            url = normalize_optional_url(item.get("url", ""))
            if not platform or not url:
                continue
            cleaned_links.append({"platform": platform, "url": url})
        return cleaned_links


class CRMContactOwnerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email"]


class CRMContactPipelineSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pipeline
        fields = ["id", "name", "kind"]


class CRMContactSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="contact.full_name")
    email = serializers.EmailField(source="contact.email")
    phone = serializers.CharField(source="contact.phone", required=False, allow_blank=True)
    phone_numbers = serializers.ListField(source="contact.phone_numbers", child=serializers.CharField(), required=False)
    notes = serializers.CharField(source="contact.notes", required=False, allow_blank=True)
    last_touch = serializers.DateField(source="contact.last_touch", required=False)
    company = CRMCompanySummarySerializer(read_only=True)
    owner = CRMContactOwnerSerializer(read_only=True)
    pipeline = CRMContactPipelineSerializer(read_only=True)
    company_id = serializers.PrimaryKeyRelatedField(source="company", queryset=CRMCompany.objects.all(), write_only=True)
    pipeline_id = serializers.PrimaryKeyRelatedField(
        source="pipeline",
        queryset=Pipeline.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )
    owner_id = serializers.PrimaryKeyRelatedField(
        source="owner",
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
        write_only=True,
    )
    stage_color = serializers.SerializerMethodField()
    stage_entered_at = serializers.DateTimeField(read_only=True)
    days_in_stage = serializers.SerializerMethodField()
    stage_history = serializers.SerializerMethodField()

    class Meta:
        model = CRMContactCompanyLink
        fields = [
            "id",
            "full_name",
            "title",
            "email",
            "phone",
            "phone_numbers",
            "company",
            "company_id",
            "pipeline",
            "pipeline_id",
            "owner",
            "owner_id",
            "status",
            "stage_color",
            "stage_entered_at",
            "days_in_stage",
            "stage_history",
            "notes",
            "last_touch",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_phone_numbers(self, value):
        return [str(number).strip() for number in value or [] if str(number).strip()]

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
        if pipeline is not None and pipeline.kind != Pipeline.KIND_CONTACTS:
            raise serializers.ValidationError({"pipeline_id": "The selected pipeline is not a contacts pipeline."})
        request = self.context.get("request")
        if pipeline is not None and request and request.user.is_authenticated and not user_can_access_pipeline(request.user, pipeline):
            raise serializers.ValidationError({"pipeline_id": "You do not have access to the selected pipeline."})

        return attrs

    def get_stage_color(self, obj):
        return resolve_stage_color(obj.pipeline, obj.status)

    def get_days_in_stage(self, obj):
        if not obj.stage_entered_at:
            return 0
        delta = timezone.now() - obj.stage_entered_at
        return max(delta.days, 0)

    def get_stage_history(self, obj):
        return serialize_stage_history(ensure_stage_history(obj.stage_history, pipeline=obj.pipeline, stage_name=obj.status, started_at=obj.stage_entered_at))

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["created_at"] = instance.contact.created_at
        return data

    def create(self, validated_data):
        contact_data = validated_data.pop("contact")
        company = validated_data["company"]
        email = contact_data["email"].strip()

        contact = CRMContact.objects.filter(tenant_company=company.tenant_company, email__iexact=email).first()
        if contact is None:
            contact = CRMContact.objects.create(
                tenant_company=company.tenant_company,
                company=company,
                pipeline=validated_data.get("pipeline"),
                owner=validated_data.get("owner"),
                title=validated_data.get("title", "").strip(),
                status=validated_data.get("status", "").strip() or "Lead",
                full_name=contact_data["full_name"].strip(),
                email=email,
                phone=contact_data.get("phone", "").strip(),
                phone_numbers=contact_data.get("phone_numbers", []),
                notes=contact_data.get("notes", "").strip(),
                last_touch=contact_data["last_touch"],
            )
        else:
            contact.full_name = contact_data["full_name"].strip()
            contact.email = email
            contact.phone_numbers = contact_data.get("phone_numbers", [])
            contact.phone = contact_data.get("phone", "").strip()
            contact.notes = contact_data.get("notes", "").strip()
            contact.last_touch = contact_data["last_touch"]
            if company and not contact.company_id:
                contact.company = company
            if validated_data.get("pipeline") and not contact.pipeline_id:
                contact.pipeline = validated_data.get("pipeline")
            if validated_data.get("owner") and not contact.owner_id:
                contact.owner = validated_data.get("owner")
            if validated_data.get("title") and not contact.title:
                contact.title = validated_data.get("title", "").strip()
            if validated_data.get("status") and (not contact.status or contact.status == "Lead"):
                contact.status = validated_data.get("status", "").strip() or "Lead"
            contact.save()

        next_pipeline = validated_data.get("pipeline")
        next_status = validated_data.get("status", "").strip() or "Lead"
        link = CRMContactCompanyLink.objects.filter(contact=contact, company=company).first()
        if link is None:
            link = CRMContactCompanyLink.objects.create(
                contact=contact,
                company=company,
                tenant_company=company.tenant_company,
                pipeline=next_pipeline,
                owner=validated_data.get("owner"),
                title=validated_data.get("title", "").strip(),
                status=next_status,
                stage_entered_at=timezone.now(),
                stage_history=[create_stage_history_entry(pipeline=next_pipeline, stage_name=next_status)],
            )
        else:
            previous_pipeline = link.pipeline
            previous_status = link.status
            previous_started_at = link.stage_entered_at
            next_history = ensure_stage_history(
                link.stage_history,
                pipeline=previous_pipeline,
                stage_name=previous_status,
                started_at=previous_started_at,
            )
            link.tenant_company = company.tenant_company
            link.pipeline = next_pipeline
            link.owner = validated_data.get("owner")
            link.title = validated_data.get("title", "").strip()
            link.status = next_status
            if previous_status != next_status or getattr(previous_pipeline, "id", None) != getattr(next_pipeline, "id", None):
                changed_at = timezone.now()
                link.stage_entered_at = changed_at
                next_history = transition_stage_history(
                    next_history,
                    previous_pipeline=previous_pipeline,
                    previous_stage=previous_status,
                    previous_started_at=previous_started_at,
                    next_pipeline=next_pipeline,
                    next_stage=next_status,
                    changed_at=changed_at,
                )
            link.stage_history = next_history
            link.save()
        return link

    def update(self, instance, validated_data):
        contact_data = validated_data.pop("contact", {})
        company = validated_data.get("company", instance.company)
        previous_status = instance.status
        previous_pipeline = instance.pipeline
        previous_started_at = instance.stage_entered_at

        contact = instance.contact
        if "full_name" in contact_data:
            contact.full_name = contact_data["full_name"].strip()
        if "email" in contact_data:
            contact.email = contact_data["email"].strip()
        if "phone_numbers" in contact_data:
            contact.phone_numbers = contact_data["phone_numbers"]
        if "phone" in contact_data:
            contact.phone = contact_data["phone"].strip()
        if "notes" in contact_data:
            contact.notes = contact_data["notes"].strip()
        if "last_touch" in contact_data:
            contact.last_touch = contact_data["last_touch"]
        if company and not contact.company_id:
            contact.company = company
        contact.save()

        instance.company = company
        if "pipeline" in validated_data:
            instance.pipeline = validated_data.get("pipeline")
        if "owner" in validated_data:
            instance.owner = validated_data.get("owner")
        if "title" in validated_data:
            instance.title = validated_data.get("title", "").strip()
        if "status" in validated_data:
            instance.status = validated_data.get("status", "").strip() or "Lead"
        if company:
            instance.tenant_company = company.tenant_company
        next_history = ensure_stage_history(
            instance.stage_history,
            pipeline=previous_pipeline,
            stage_name=previous_status,
            started_at=previous_started_at,
        )
        if ("status" in validated_data and instance.status != previous_status) or (
            "pipeline" in validated_data and getattr(instance.pipeline, "id", None) != getattr(previous_pipeline, "id", None)
        ):
            changed_at = timezone.now()
            instance.stage_entered_at = changed_at
            next_history = transition_stage_history(
                next_history,
                previous_pipeline=previous_pipeline,
                previous_stage=previous_status,
                previous_started_at=previous_started_at,
                next_pipeline=instance.pipeline,
                next_stage=instance.status,
                changed_at=changed_at,
            )
        instance.stage_history = next_history
        instance.save()
        return instance
