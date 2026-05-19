from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0008_contact_relationships"),
    ]

    operations = [
        migrations.AddField(
            model_name="crmcompany",
            name="created_by_import",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="crmcompany",
            name="imported_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="crmcontact",
            name="created_by_import",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="crmcontact",
            name="imported_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="crmcontactcompanylink",
            name="created_by_import",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="crmcontactcompanylink",
            name="imported_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
