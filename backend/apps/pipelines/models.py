from django.db import models
from django.utils import timezone


class Pipeline(models.Model):
    KIND_CONTACTS = "contacts"
    KIND_DEALS = "deals"
    KIND_CHOICES = [
        (KIND_CONTACTS, "Contacts"),
        (KIND_DEALS, "Deals"),
    ]

    name = models.CharField(max_length=255)
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="pipelines")
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default=KIND_CONTACTS)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_pipelines",
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["kind", "name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["company", "kind", "name"], name="unique_pipeline_name_per_company_and_kind"),
        ]

    def __str__(self):
        return self.name


class PipelineMember(models.Model):
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="pipeline_memberships")
    has_full_access = models.BooleanField(default=False)
    can_invite_members = models.BooleanField(default=False)
    can_edit_pipeline = models.BooleanField(default=False)
    can_delete_pipeline = models.BooleanField(default=False)
    can_manage_statuses = models.BooleanField(default=False)
    can_view_contacts = models.BooleanField(default=False)
    can_move_contacts = models.BooleanField(default=False)
    can_manage_contacts = models.BooleanField(default=False)
    can_view_companies = models.BooleanField(default=False)
    can_manage_companies = models.BooleanField(default=False)
    can_view_deals = models.BooleanField(default=False)
    can_move_deals = models.BooleanField(default=False)
    can_manage_deals = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["pipeline_id", "user_id"]
        constraints = [
            models.UniqueConstraint(fields=["pipeline", "user"], name="unique_pipeline_member"),
        ]

    def __str__(self):
        return f"{self.user_id} in {self.pipeline_id}"


class PipelineStatus(models.Model):
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name="statuses")
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=7, default="#7C5F35")
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(fields=["pipeline", "name"], name="unique_status_name_per_pipeline"),
        ]

    def __str__(self):
        return f"{self.pipeline.name} - {self.name}"
