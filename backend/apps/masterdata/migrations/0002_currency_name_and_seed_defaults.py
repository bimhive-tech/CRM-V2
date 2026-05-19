from django.db import migrations, models


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


def seed_defaults(apps, schema_editor):
    Company = apps.get_model("companies", "Company")
    Currency = apps.get_model("masterdata", "Currency")
    PipelineStatusTemplate = apps.get_model("masterdata", "PipelineStatusTemplate")

    for company in Company.objects.all():
        existing_currency_names = set(Currency.objects.filter(company=company).values_list("name", flat=True))
        for item in DEFAULT_CURRENCIES:
            if item["name"] in existing_currency_names:
                continue
            Currency.objects.create(company=company, **item)

        if not Currency.objects.filter(company=company, is_default=True).exists():
            default_currency = Currency.objects.filter(company=company, name="Egyptian Pound").first() or Currency.objects.filter(company=company).first()
            if default_currency:
                Currency.objects.filter(company=company, is_default=True).exclude(pk=default_currency.pk).update(is_default=False)
                default_currency.is_default = True
                default_currency.save(update_fields=["is_default"])

        existing_template_names = set(PipelineStatusTemplate.objects.filter(company=company).values_list("name", flat=True))
        next_position = PipelineStatusTemplate.objects.filter(company=company).count()
        for item in DEFAULT_PIPELINE_STATUS_TEMPLATES:
            if item["name"] in existing_template_names:
                continue
            PipelineStatusTemplate.objects.create(company=company, name=item["name"], color=item["color"], position=next_position)
            next_position += 1


class Migration(migrations.Migration):

    dependencies = [
        ("masterdata", "0001_initial"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="currency",
            name="unique_currency_code_per_company",
        ),
        migrations.RemoveField(
            model_name="currency",
            name="code",
        ),
        migrations.AddConstraint(
            model_name="currency",
            constraint=models.UniqueConstraint(fields=("company", "name"), name="unique_currency_name_per_company"),
        ),
        migrations.RunPython(seed_defaults, migrations.RunPython.noop),
    ]
