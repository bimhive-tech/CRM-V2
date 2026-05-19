from django.db import migrations, models


def backfill_contact_phone_numbers(apps, schema_editor):
    CRMContact = apps.get_model("crm", "CRMContact")
    for contact in CRMContact.objects.all():
        primary_phone = (contact.phone or "").strip()
        if primary_phone and not contact.phone_numbers:
            contact.phone_numbers = [primary_phone]
            contact.save(update_fields=["phone_numbers"])


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0006_crmcompany_social_links_latitude_longitude"),
    ]

    operations = [
        migrations.AddField(
            model_name="crmcontact",
            name="phone_numbers",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_contact_phone_numbers, migrations.RunPython.noop),
    ]
