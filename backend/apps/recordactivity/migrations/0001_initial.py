from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("accounts", "0006_company_admin_pipeline_member_permission"),
        ("crm", "0011_crmcompany_imported_by_crmcontact_imported_by_and_more"),
        ("deals", "0002_deal_scope_of_work"),
    ]

    operations = [
        migrations.CreateModel(
            name="RecordActivity",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("target_type", models.CharField(choices=[("contact", "Contact"), ("company", "Company"), ("deal", "Project")], max_length=16)),
                ("kind", models.CharField(choices=[("note", "Note"), ("task", "Task"), ("meeting", "Meeting")], max_length=16)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True)),
                ("activity_date", models.DateField(default=django.utils.timezone.localdate)),
                ("is_done", models.BooleanField(default=False)),
                ("position", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="record_activities", to="crm.crmcompany")),
                ("contact", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="record_activities", to="crm.crmcontactcompanylink")),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_record_activities", to="accounts.user")),
                ("deal", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="record_activities", to="deals.deal")),
                ("updated_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="updated_record_activities", to="accounts.user")),
            ],
            options={
                "ordering": ["kind", "position", "-activity_date", "-created_at", "-id"],
            },
        ),
    ]
