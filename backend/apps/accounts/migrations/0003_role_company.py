from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("companies", "0004_company_address_country_company_address_line_and_more"),
        ("accounts", "0002_role_user_companies_user_roles"),
    ]

    operations = [
        migrations.AddField(
            model_name="role",
            name="company",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="roles", to="companies.company"),
        ),
    ]
