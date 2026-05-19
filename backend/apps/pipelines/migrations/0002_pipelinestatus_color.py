from django.db import migrations, models


DEFAULT_COLORS_BY_NAME = {
    "lead": "#8C7A61",
    "qualified": "#2C7FB8",
    "proposal": "#C66A1E",
    "negotiation": "#D18918",
    "customer": "#3E9B64",
}


def backfill_status_colors(apps, schema_editor):
    PipelineStatus = apps.get_model("pipelines", "PipelineStatus")

    for status in PipelineStatus.objects.all():
        status.color = DEFAULT_COLORS_BY_NAME.get(status.name.strip().lower(), "#7C5F35")
        status.save(update_fields=["color"])


class Migration(migrations.Migration):
    dependencies = [
        ("pipelines", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="pipelinestatus",
            name="color",
            field=models.CharField(default="#7C5F35", max_length=7),
        ),
        migrations.RunPython(backfill_status_colors, migrations.RunPython.noop),
    ]
