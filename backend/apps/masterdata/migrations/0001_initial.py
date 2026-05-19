from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("companies", "0004_company_address_country_company_address_line_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="Currency",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("code", models.CharField(max_length=16)),
                ("name", models.CharField(max_length=128)),
                ("symbol", models.CharField(blank=True, max_length=16)),
                ("is_default", models.BooleanField(default=False)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="currencies", to="companies.company")),
            ],
            options={
                "ordering": ["name", "id"],
                "constraints": [models.UniqueConstraint(fields=("company", "code"), name="unique_currency_code_per_company")],
            },
        ),
        migrations.CreateModel(
            name="PipelineStatusTemplate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=255)),
                ("color", models.CharField(default="#7C5F35", max_length=7)),
                ("position", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="pipeline_status_templates", to="companies.company")),
            ],
            options={
                "ordering": ["position", "id"],
                "constraints": [models.UniqueConstraint(fields=("company", "name"), name="unique_pipeline_status_template_per_company")],
            },
        ),
    ]
