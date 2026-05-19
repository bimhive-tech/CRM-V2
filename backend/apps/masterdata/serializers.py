from rest_framework import serializers

from apps.masterdata.models import Currency, PipelineStatusTemplate


class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ["id", "code", "name", "symbol", "is_default", "is_active", "created_at"]
        read_only_fields = ["id", "created_at"]


class PipelineStatusTemplateSerializer(serializers.ModelSerializer):
    position = serializers.IntegerField(required=False, min_value=0)

    class Meta:
        model = PipelineStatusTemplate
        fields = ["id", "name", "color", "position", "created_at"]
        read_only_fields = ["id", "created_at"]
