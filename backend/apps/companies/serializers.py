from rest_framework import serializers

from apps.companies.models import Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "slug", "email", "phone_number", "website", "address", "is_active", "created_at"]
        read_only_fields = ["id", "slug", "created_at"]
