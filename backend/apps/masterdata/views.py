from django.db import transaction
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import ValidationError

from apps.accounts.permissions import CanAccessSettings
from apps.masterdata.models import Currency, PipelineStatusTemplate
from apps.masterdata.serializers import CurrencySerializer, PipelineStatusTemplateSerializer


DEFAULT_CURRENCIES = [
    {"code": "EGP", "name": "Egyptian Pound", "symbol": "EGP", "is_default": True},
]

DEFAULT_PIPELINE_STATUS_TEMPLATES = [
    {"name": "Lead", "color": "#8C7A61"},
    {"name": "Qualified", "color": "#2C7FB8"},
    {"name": "Proposal", "color": "#C66A1E"},
    {"name": "Negotiation", "color": "#D18918"},
    {"name": "Customer", "color": "#3E9B64"},
]


def company_ids_for_user(user):
    ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in ids:
        ids.append(user.company_id)
    return ids


def resolve_company_for_settings(user, company_id=None):
    accessible_ids = company_ids_for_user(user)
    from apps.companies.models import Company

    if getattr(user, "is_platform_admin", False):
        if company_id:
            return generics.get_object_or_404(Company, pk=company_id)
        company = user.company or user.companies.order_by("name", "id").first() or Company.objects.order_by("name", "id").first()
        if company is None:
            raise serializers.ValidationError({"detail": "No company is available."})
        return company

    if company_id and int(company_id) not in accessible_ids:
        raise ValidationError({"detail": "You do not have access to that company."})

    target_id = int(company_id) if company_id else (user.company_id or accessible_ids[0] if accessible_ids else None)
    if target_id is None:
        raise serializers.ValidationError({"detail": "This user is not assigned to a company."})

    return generics.get_object_or_404(Company, pk=target_id)


def ensure_default_currencies(company):
    if company.currencies.exists():
        if not company.currencies.filter(is_default=True).exists():
            first_currency = company.currencies.order_by("id").first()
            if first_currency:
                first_currency.is_default = True
                first_currency.save(update_fields=["is_default"])
        return

    Currency.objects.bulk_create([Currency(company=company, **item) for item in DEFAULT_CURRENCIES])


def ensure_default_pipeline_status_templates(company):
    if company.pipeline_status_templates.exists():
        return

    PipelineStatusTemplate.objects.bulk_create(
        [
            PipelineStatusTemplate(company=company, name=item["name"], color=item["color"], position=index)
            for index, item in enumerate(DEFAULT_PIPELINE_STATUS_TEMPLATES)
        ]
    )


def set_default_currency(currency):
    Currency.objects.filter(company=currency.company, is_default=True).exclude(pk=currency.pk).update(is_default=False)
    if not currency.is_default:
        currency.is_default = True
        currency.save(update_fields=["is_default"])


def normalize_template_positions(company):
    for index, template in enumerate(company.pipeline_status_templates.order_by("position", "id")):
        if template.position != index:
            template.position = index
            template.save(update_fields=["position"])


def reorder_pipeline_status_template(template, next_position):
    siblings = list(template.company.pipeline_status_templates.order_by("position", "id"))
    siblings = [item for item in siblings if item.id != template.id]
    bounded_position = max(0, min(next_position, len(siblings)))
    siblings.insert(bounded_position, template)

    for index, item in enumerate(siblings):
        if item.position != index:
            item.position = index
            item.save(update_fields=["position"])


class CurrencyListCreateView(generics.ListCreateAPIView):
    serializer_class = CurrencySerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        company = resolve_company_for_settings(self.request.user, self.request.query_params.get("company_id"))
        ensure_default_currencies(company)
        return Currency.objects.filter(company=company).order_by("name", "id")

    def perform_create(self, serializer):
        company = resolve_company_for_settings(self.request.user, self.request.query_params.get("company_id"))
        currency = serializer.save(company=company)
        if currency.is_default or not company.currencies.exclude(pk=currency.pk).filter(is_default=True).exists():
            set_default_currency(currency)


class CurrencyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CurrencySerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        queryset = Currency.objects.select_related("company")
        if self.request.user.is_platform_admin:
            return queryset
        return queryset.filter(company_id__in=company_ids_for_user(self.request.user))

    def perform_update(self, serializer):
        currency = serializer.save()
        if currency.is_default:
            set_default_currency(currency)
        elif not currency.company.currencies.filter(is_default=True).exists():
            fallback_currency = currency.company.currencies.exclude(pk=currency.pk).order_by("name", "id").first() or currency
            set_default_currency(fallback_currency)

    def perform_destroy(self, instance):
        company = instance.company
        was_default = instance.is_default
        instance.delete()
        if was_default:
            next_currency = company.currencies.order_by("name", "id").first()
            if next_currency:
                set_default_currency(next_currency)


class PipelineStatusTemplateListCreateView(generics.ListCreateAPIView):
    serializer_class = PipelineStatusTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        company = resolve_company_for_settings(self.request.user, self.request.query_params.get("company_id"))
        ensure_default_pipeline_status_templates(company)
        return PipelineStatusTemplate.objects.filter(company=company).order_by("position", "id")

    @transaction.atomic
    def perform_create(self, serializer):
        company = resolve_company_for_settings(self.request.user, self.request.query_params.get("company_id"))
        serializer.save(company=company, position=company.pipeline_status_templates.count())


class PipelineStatusTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PipelineStatusTemplateSerializer
    permission_classes = [permissions.IsAuthenticated, CanAccessSettings]

    def get_queryset(self):
        queryset = PipelineStatusTemplate.objects.select_related("company")
        if self.request.user.is_platform_admin:
            return queryset
        return queryset.filter(company_id__in=company_ids_for_user(self.request.user))

    @transaction.atomic
    def perform_update(self, serializer):
        template = self.get_object()
        next_position = serializer.validated_data.pop("position", None)
        serializer.save()
        if next_position is not None:
            reorder_pipeline_status_template(template, next_position)

    @transaction.atomic
    def perform_destroy(self, instance):
        company = instance.company
        instance.delete()
        normalize_template_positions(company)
