from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import HasAppPermission
from apps.companies.models import Company
from apps.deals.models import Deal
from apps.targets.models import QuarterlyTarget
from apps.targets.serializers import QuarterlyTargetSerializer, TargetSummarySerializer, build_target_summary


def company_ids_for_user(user):
    ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in ids:
        ids.append(user.company_id)
    return ids


def resolve_default_company_for_user(user):
    company = user.company or user.companies.order_by("name", "id").first()
    if company:
        return company
    raise ValidationError({"detail": "This user is not assigned to a company."})


def resolve_company_for_user(user, company_id=None):
    if company_id:
        allowed_ids = set(company_ids_for_user(user))
        if getattr(user, "is_platform_admin", False) and user.company_id and user.company_id not in allowed_ids:
            allowed_ids.add(user.company_id)
        if int(company_id) not in allowed_ids:
            raise ValidationError({"detail": "You do not have access to that company."})
        return Company.objects.get(pk=company_id)
    return resolve_default_company_for_user(user)


def current_quarter_parts():
    today = timezone.localdate()
    return today.year, ((today.month - 1) // 3) + 1


def quarter_month_bounds(year, quarter):
    start_month = ((quarter - 1) * 3) + 1
    end_month = start_month + 2
    return start_month, end_month


def users_for_company(company):
    return (
        User.objects.filter(Q(company=company) | Q(companies=company))
        .select_related("company")
        .prefetch_related("roles")
        .distinct()
        .order_by("full_name", "email", "id")
    )


class QuarterlyTargetListCreateView(generics.ListCreateAPIView):
    serializer_class = QuarterlyTargetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = QuarterlyTarget.objects.select_related("company", "user").filter(company_id__in=company_ids_for_user(self.request.user))
        company_id = self.request.query_params.get("company_id", "").strip()
        year = self.request.query_params.get("year", "").strip()
        quarter = self.request.query_params.get("quarter", "").strip()
        user_id = self.request.query_params.get("user_id", "").strip()
        if company_id:
            queryset = queryset.filter(company_id=company_id)
        if year:
            queryset = queryset.filter(year=year)
        if quarter:
            queryset = queryset.filter(quarter=quarter)
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        return queryset

    def perform_create(self, serializer):
        if not (self.request.user.is_platform_admin or self.request.user.is_company_admin or self.request.user.has_app_permission("users.update")):
            raise ValidationError({"detail": "You do not have permission to manage quarterly targets."})

        target_user = serializer.validated_data["user"]
        company = resolve_company_for_user(self.request.user, target_user.company_id or target_user.companies.order_by("id").values_list("id", flat=True).first())
        if company.id not in company_ids_for_user(target_user):
            raise ValidationError({"user_id": "The selected user does not belong to the chosen company."})
        serializer.save(company=company, created_by=self.request.user)


class QuarterlyTargetDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = QuarterlyTargetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return QuarterlyTarget.objects.select_related("company", "user").filter(company_id__in=company_ids_for_user(self.request.user))

    def _assert_manage_access(self):
        if self.request.user.is_platform_admin or self.request.user.is_company_admin or self.request.user.has_app_permission("users.update"):
            return
        raise ValidationError({"detail": "You do not have permission to manage quarterly targets."})

    def perform_update(self, serializer):
        self._assert_manage_access()
        instance = self.get_object()
        target_user = serializer.validated_data.get("user", instance.user)
        if instance.company_id not in company_ids_for_user(target_user):
            raise ValidationError({"user_id": "The selected user does not belong to this company."})
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_manage_access()
        instance.delete()


class TargetSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = resolve_company_for_user(request.user, request.query_params.get("company_id"))
        year = int(request.query_params.get("year") or current_quarter_parts()[0])
        quarter = int(request.query_params.get("quarter") or current_quarter_parts()[1])
        if quarter not in {1, 2, 3, 4}:
            raise ValidationError({"quarter": "Quarter must be between 1 and 4."})

        start_month, end_month = quarter_month_bounds(year, quarter)
        company_users = list(users_for_company(company))
        targets = QuarterlyTarget.objects.filter(company=company, year=year, quarter=quarter, user__in=company_users)
        targets_by_user = {item.user_id: item.target_value for item in targets}
        achieved_rows = (
            Deal.objects.filter(
                tenant_company=company,
                owner__in=company_users,
                expected_close_date__year=year,
                expected_close_date__month__gte=start_month,
                expected_close_date__month__lte=end_month,
            )
            .values("owner_id")
            .annotate(total_amount=Sum("amount"))
        )
        deals_by_owner = {item["owner_id"]: item["total_amount"] or Decimal("0") for item in achieved_rows}
        payload = build_target_summary(
            company=company,
            users=company_users,
            deals_by_owner=deals_by_owner,
            targets_by_user=targets_by_user,
            year=year,
            quarter=quarter,
        )
        return Response(TargetSummarySerializer(payload).data)


class MyTargetSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = resolve_company_for_user(request.user, request.query_params.get("company_id"))
        year = int(request.query_params.get("year") or current_quarter_parts()[0])
        quarter = int(request.query_params.get("quarter") or current_quarter_parts()[1])
        if request.user.id not in company.members.values_list("id", flat=True) and request.user.company_id != company.id:
            raise ValidationError({"detail": "You do not belong to that company."})

        start_month, end_month = quarter_month_bounds(year, quarter)
        target = QuarterlyTarget.objects.filter(company=company, user=request.user, year=year, quarter=quarter).first()
        achieved_value = (
            Deal.objects.filter(
                tenant_company=company,
                owner=request.user,
                expected_close_date__year=year,
                expected_close_date__month__gte=start_month,
                expected_close_date__month__lte=end_month,
            ).aggregate(total_amount=Sum("amount"))["total_amount"]
            or Decimal("0")
        )
        target_value = target.target_value if target else Decimal("0")
        payload = {
            "company_id": company.id,
            "year": year,
            "quarter": quarter,
            "quarter_label": f"Q{quarter} {year}",
            "totals": {
                "target_value": target_value,
                "achieved_value": achieved_value,
                "progress_percent": round(float((achieved_value / target_value) * 100), 2) if target_value > 0 else 0.0,
                "user_count": 1,
            },
            "users": [
                {
                    "user": request.user,
                    "target_value": target_value,
                    "achieved_value": achieved_value,
                    "progress_percent": round(float((achieved_value / target_value) * 100), 2) if target_value > 0 else 0.0,
                }
            ],
        }
        return Response(TargetSummarySerializer(payload).data)
