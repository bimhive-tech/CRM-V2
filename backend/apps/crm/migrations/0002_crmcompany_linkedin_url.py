from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="crmcompany",
            name="linkedin_url",
            field=models.URLField(blank=True),
        ),
    ]
