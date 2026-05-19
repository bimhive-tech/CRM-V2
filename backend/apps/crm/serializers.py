from rest_framework import serializers

from apps.accounts.models import User
from apps.crm.models import CRMCompany, CRMContact


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
    website = serializers.CharField(allow_blank=True, required=False)
    linkedin_url = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = CRMCompany
        fields = [
            "id",
            "name",
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
    class Meta:
        model = CRMContact
        fields = ["id", "full_name", "title", "email", "phone", "status"]


class CRMCompanySerializer(serializers.ModelSerializer):
    website = serializers.CharField(allow_blank=True, required=False)
    linkedin_url = serializers.CharField(allow_blank=True, required=False)
    contacts = CRMCompanyContactSummarySerializer(many=True, read_only=True)

    class Meta:
        model = CRMCompany
        fields = [
            "id",
            "name",
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


class CRMContactSerializer(serializers.ModelSerializer):
    company = CRMCompanySummarySerializer(read_only=True)
    owner = CRMContactOwnerSerializer(read_only=True)
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
