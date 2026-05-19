from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pipelines", "0001_initial"),
        ("crm", "0002_crmcompany_linkedin_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="crmcontact",
            name="pipeline",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.deletion.SET_NULL,
                related_name="contacts",
                to="pipelines.pipeline",
            ),
        ),
    ]
