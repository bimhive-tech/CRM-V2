from decimal import Decimal

from rest_framework import serializers

from apps.accounts.models import User
from apps.targets.models import QuarterlyTarget


class TargetUserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email"]


class QuarterlyTargetSerializer(serializers.ModelSerializer):
    user = TargetUserSummarySerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(source="user", queryset=User.objects.all(), write_only=True)

    class Meta:
        model = QuarterlyTarget
        fields = [
            "id",
            "user",
            "user_id",
            "year",
            "quarter",
            "target_value",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TargetSummaryItemSerializer(serializers.Serializer):
    user = TargetUserSummarySerializer()
    target_value = serializers.DecimalField(max_digits=14, decimal_places=2)
    achieved_value = serializers.DecimalField(max_digits=14, decimal_places=2)
    progress_percent = serializers.FloatField()


class TargetSummarySerializer(serializers.Serializer):
    company_id = serializers.IntegerField()
    year = serializers.IntegerField()
    quarter = serializers.IntegerField()
    quarter_label = serializers.CharField()
    totals = serializers.DictField()
    users = TargetSummaryItemSerializer(many=True)


def build_target_summary(*, company, users, deals_by_owner, targets_by_user, year, quarter):
    rows = []
    total_target = Decimal("0")
    total_achieved = Decimal("0")

    for user in users:
        target_value = Decimal(targets_by_user.get(user.id, Decimal("0")) or Decimal("0"))
        achieved_value = Decimal(deals_by_owner.get(user.id, Decimal("0")) or Decimal("0"))
        total_target += target_value
        total_achieved += achieved_value
        progress_percent = float((achieved_value / target_value) * 100) if target_value > 0 else 0.0
        rows.append(
            {
                "user": user,
                "target_value": target_value,
                "achieved_value": achieved_value,
                "progress_percent": round(progress_percent, 2),
            }
        )

    total_progress = float((total_achieved / total_target) * 100) if total_target > 0 else 0.0
    return {
        "company_id": company.id,
        "year": year,
        "quarter": quarter,
        "quarter_label": f"Q{quarter} {year}",
        "totals": {
            "target_value": total_target,
            "achieved_value": total_achieved,
            "progress_percent": round(total_progress, 2),
            "user_count": len(rows),
        },
        "users": rows,
    }
