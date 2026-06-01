from django.db import migrations, models
from django.utils import timezone


def backfill_deal_stage_history(apps, schema_editor):
    Deal = apps.get_model("deals", "Deal")
    for deal in Deal.objects.all().iterator():
        if deal.stage_history:
            continue
        started_at = deal.stage_entered_at or timezone.now()
        deal.stage_history = [
            {
                "stage": deal.stage or "",
                "pipeline_id": deal.pipeline_id,
                "stage_color": "#7C5F35",
                "started_at": started_at.isoformat(),
                "ended_at": None,
            }
        ]
        deal.save(update_fields=["stage_history"])


class Migration(migrations.Migration):

    dependencies = [
        ("deals", "0002_deal_scope_of_work"),
    ]

    operations = [
        migrations.AddField(
            model_name="deal",
            name="stage_history",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_deal_stage_history, migrations.RunPython.noop),
    ]
