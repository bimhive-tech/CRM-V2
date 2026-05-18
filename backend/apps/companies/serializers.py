from rest_framework import serializers

from apps.contacts.models import Contact
from apps.companies.models import Company
from apps.companies.storage import signed_logo_url


class CompanyContactSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ["id", "full_name", "title", "email", "phone", "status"]


class CompanySerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    contacts = CompanyContactSummarySerializer(many=True, read_only=True)

    def get_logo_url(self, obj):
        return signed_logo_url(obj.logo_key)

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "slug",
            "owner_name",
            "email",
            "phone_number",
            "phone_numbers",
            "website",
            "address",
            "address_country",
            "address_state",
            "address_line",
            "employee_count",
            "logo_url",
            "contacts",
            "is_active",
            "created_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "logo_url"]
