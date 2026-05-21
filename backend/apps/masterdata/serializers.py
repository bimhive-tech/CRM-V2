from rest_framework import serializers

from apps.masterdata.models import CompanyIndustry, Currency, PipelineStatusTemplate, ScopeOfWorkTemplate


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ["id", "name", "symbol", "is_default", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class PipelineStatusTemplateSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(required=False, min_value=0)

    class Meta:
        model = PipelineStatusTemplate
        fields = ["id", "name", "color", "position", "created_at"]
        read_only_fields = ["id", "created_at"]


class CompanyIndustrySerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(required=False, min_value=0)

    class Meta:
        model = CompanyIndustry
        fields = ["id", "name", "position", "created_at"]
        read_only_fields = ["id", "created_at"]


class ScopeOfWorkTemplateSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(required=False, min_value=0)

    class Meta:
        model = ScopeOfWorkTemplate
        fields = ["id", "name", "content", "position", "created_at"]
        read_only_fields = ["id", "created_at"]
