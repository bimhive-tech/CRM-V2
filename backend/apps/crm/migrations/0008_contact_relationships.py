from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def backfill_contact_relationships(apps, schema_editor):
    CRMContact = apps.get_model("crm", "CRMContact")
    CRMContactCompanyLink = apps.get_model("crm", "CRMContactCompanyLink")

    for contact in CRMContact.objects.filter(company__isnull=False):
        CRMContactCompanyLink.objects.get_or_create(
            tenant_company_id=contact.tenant_company_id,
            contact_id=contact.id,
            company_id=contact.company_id,
            defaults={
                "pipeline_id": contact.pipeline_id,
                "owner_id": contact.owner_id,
                "title": contact.title,
                "status": contact.status or "Lead",
                "created_at": contact.created_at,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0007_crmcontact_phone_numbers"),
    ]

    operations = [
        migrations.AlterField(
            model_name="crmcontact",
            name="company",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="contacts", to="crm.crmcompany"),
        ),
        migrations.CreateModel(
            name="CRMContactCompanyLink",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(blank=True, max_length=255)),
                ("status", models.CharField(default="Lead", max_length=255)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contact_links", to="crm.crmcompany")),
                ("contact", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="company_links", to="crm.crmcontact")),
                ("owner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="owned_crm_contact_links", to="accounts.user")),
                ("pipeline", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="contact_links", to="pipelines.pipeline")),
                ("tenant_company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="crm_contact_links", to="companies.company")),
            ],
            options={
                "ordering": ["contact__full_name", "contact__email", "id"],
            },
        ),
        migrations.AddConstraint(
            model_name="crmcontactcompanylink",
            constraint=models.UniqueConstraint(fields=("contact", "company"), name="unique_crm_contact_company_link"),
        ),
        migrations.RunPython(backfill_contact_relationships, migrations.RunPython.noop),
    ]
