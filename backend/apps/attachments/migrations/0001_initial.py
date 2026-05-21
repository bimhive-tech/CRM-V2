from django.db import migrations, models
import django.db.models.deletion
import apps.attachments.models
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0006_company_admin_pipeline_member_permission"),
        ("crm", "0008_contact_relationships"),
        ("deals", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Attachment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("target_type", models.CharField(choices=[("contact", "Contact"), ("company", "Company"), ("deal", "Deal")], max_length=16)),
                ("file", models.FileField(max_length=512, upload_to=apps.attachments.models.attachment_upload_to)),
                ("original_name", models.CharField(max_length=255)),
                ("content_type", models.CharField(blank=True, max_length=255)),
                ("file_size", models.PositiveBigIntegerField(default=0)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("company", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="crm.crmcompany")),
                ("contact", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="crm.crmcontactcompanylink")),
                ("deal", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="deals.deal")),
                ("uploaded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="uploaded_attachments", to="accounts.user")),
            ],
            options={
                "ordering": ["-created_at", "-id"],
            },
        ),
    ]
