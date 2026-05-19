from django.db import migrations


def assign_single_pipeline_to_unassigned_contacts(apps, schema_editor):
    CRMContact = apps.get_model("crm", "CRMContact")
    Pipeline = apps.get_model("pipelines", "Pipeline")

    company_ids = CRMContact.objects.filter(pipeline__isnull=True).values_list("tenant_company_id", flat=True).distinct()

    for company_id in company_ids:
        pipelines = list(Pipeline.objects.filter(company_id=company_id).values_list("id", flat=True))
        if len(pipelines) != 1:
            continue

        CRMContact.objects.filter(tenant_company_id=company_id, pipeline__isnull=True).update(pipeline_id=pipelines[0])


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0003_crmcontact_pipeline"),
        ("pipelines", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(assign_single_pipeline_to_unassigned_contacts, migrations.RunPython.noop),
    ]
