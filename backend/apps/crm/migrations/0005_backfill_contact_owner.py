from django.db import migrations


def assign_owner_to_unowned_contacts(apps, schema_editor):
    CRMContact = apps.get_model("crm", "CRMContact")
    User = apps.get_model("accounts", "User")

    company_ids = CRMContact.objects.filter(owner__isnull=True).values_list("tenant_company_id", flat=True).distinct()

    for company_id in company_ids:
        users = list(User.objects.filter(companies__id=company_id).distinct().values_list("id", flat=True))
        if len(users) != 1:
            continue

        CRMContact.objects.filter(tenant_company_id=company_id, owner__isnull=True).update(owner_id=users[0])


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0004_backfill_single_pipeline_contacts"),
        ("accounts", "0002_role_user_companies_user_roles"),
    ]

    operations = [
        migrations.RunPython(assign_owner_to_unowned_contacts, migrations.RunPython.noop),
    ]
