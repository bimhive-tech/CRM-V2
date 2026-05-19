from apps.masterdata.models import Currency, PipelineStatusTemplate


DEFAULT_CURRENCIES = [
    {"name": "Egyptian Pound", "symbol": "EGP", "is_default": True},
    {"name": "US Dollar", "symbol": "$", "is_default": False},
    {"name": "Euro", "symbol": "EUR", "is_default": False},
    {"name": "Saudi Riyal", "symbol": "SAR", "is_default": False},
    {"name": "UAE Dirham", "symbol": "AED", "is_default": False},
]

DEFAULT_PIPELINE_STATUS_TEMPLATES = [
    {"name": "Lead", "color": "#8C7A61"},
    {"name": "Qualified", "color": "#2C7FB8"},
    {"name": "Proposal", "color": "#C66A1E"},
    {"name": "Negotiation", "color": "#D18918"},
    {"name": "Customer", "color": "#3E9B64"},
]


def set_default_currency(currency):
    Currency.objects.filter(company=currency.company, is_default=True).exclude(pk=currency.pk).update(is_default=False)
    if not currency.is_default:
        currency.is_default = True
        currency.save(update_fields=["is_default"])


def create_missing_default_currencies(company):
    existing_names = set(company.currencies.values_list("name", flat=True))
    created = []

    for item in DEFAULT_CURRENCIES:
        if item["name"] in existing_names:
            continue
        created.append(Currency(company=company, **item))

    if created:
        Currency.objects.bulk_create(created)

    if not company.currencies.filter(is_default=True).exists():
        default_currency = company.currencies.filter(name=DEFAULT_CURRENCIES[0]["name"]).first() or company.currencies.order_by("id").first()
        if default_currency:
            set_default_currency(default_currency)


def create_missing_default_pipeline_status_templates(company):
    existing_names = set(company.pipeline_status_templates.values_list("name", flat=True))
    next_position = company.pipeline_status_templates.count()
    to_create = []

    for item in DEFAULT_PIPELINE_STATUS_TEMPLATES:
        if item["name"] in existing_names:
            continue
        to_create.append(
            PipelineStatusTemplate(
                company=company,
                name=item["name"],
                color=item["color"],
                position=next_position,
            )
        )
        next_position += 1

    if to_create:
        PipelineStatusTemplate.objects.bulk_create(to_create)


def initialize_company_master_data(company):
    create_missing_default_currencies(company)
    create_missing_default_pipeline_status_templates(company)
