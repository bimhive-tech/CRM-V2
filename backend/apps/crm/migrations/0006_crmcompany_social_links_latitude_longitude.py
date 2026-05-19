from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("crm", "0005_backfill_contact_owner"),
    ]

    operations = [
        migrations.AddField(
            model_name="crmcompany",
            name="latitude",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="crmcompany",
            name="longitude",
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="crmcompany",
            name="social_links",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
