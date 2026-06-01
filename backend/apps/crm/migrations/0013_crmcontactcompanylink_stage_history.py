from django.db import migrations, models
from django.utils import timezone


def backfill_contact_stage_history(apps, schema_editor):
    CRMContactCompanyLink = apps.get_model("crm", "CRMContactCompanyLink")
    for link in CRMContactCompanyLink.objects.all().iterator():
        if link.stage_history:
            continue
        started_at = link.stage_entered_at or timezone.now()
        link.stage_history = [
            {
                "stage": link.status or "",
                "pipeline_id": link.pipeline_id,
                "stage_color": "#7C5F35",
                "started_at": started_at.isoformat(),
                "ended_at": None,
            }
        ]
        link.save(update_fields=["stage_history"])


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0012_crmcontactcompanylink_stage_entered_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="crmcontactcompanylink",
            name="stage_history",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_contact_stage_history, migrations.RunPython.noop),
    ]
