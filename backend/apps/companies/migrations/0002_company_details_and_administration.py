from django.db import migrations, models


def seed_administration_company(apps, schema_editor):
    Company = apps.get_model("companies", "Company")
    User = apps.get_model("accounts", "User")

    company, _ = Company.objects.get_or_create(
        name="Administration",
        defaults={
            "email": "",
            "phone_number": "",
            "website": "",
            "address": "",
            "is_active": True,
        },
    )

    for user in User.objects.filter(role="platform_admin"):
        if not user.company_id:
            user.company = company
            user.save(update_fields=["company"])
        user.companies.add(company)


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_role_user_companies_user_roles"),
        ("companies", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="address",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="company",
            name="email",
            field=models.EmailField(blank=True, max_length=254),
        ),
        migrations.AddField(
            model_name="company",
            name="phone_number",
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name="company",
            name="website",
            field=models.URLField(blank=True),
        ),
        migrations.RunPython(seed_administration_company, migrations.RunPython.noop),
    ]
