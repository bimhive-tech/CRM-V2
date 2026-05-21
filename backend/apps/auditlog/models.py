from django.db import models
from django.utils import timezone


class AuditLogEntry(models.Model):
    TYPE_ATTACHMENT = "attachment"
    TYPE_AUTH = "auth"
    TYPE_COMPANY = "company"
    TYPE_CONTACT = "contact"
    TYPE_DEAL = "deal"
    TYPE_IMPORT = "import"
    TYPE_NOTE = "note"
    TYPE_PIPELINE = "pipeline"
    TYPE_ROLE = "role"
    TYPE_STATUS = "status"
    TYPE_TEAM = "team"
    TYPE_USER = "user"

    EVENT_TYPE_CHOICES = [
        (TYPE_ATTACHMENT, "Attachments"),
        (TYPE_AUTH, "Auth"),
        (TYPE_COMPANY, "Companies"),
        (TYPE_CONTACT, "Contacts"),
        (TYPE_DEAL, "Deals"),
        (TYPE_IMPORT, "Imports"),
        (TYPE_NOTE, "Notes"),
        (TYPE_PIPELINE, "Pipelines"),
        (TYPE_ROLE, "Roles"),
        (TYPE_STATUS, "Statuses"),
        (TYPE_TEAM, "Team"),
        (TYPE_USER, "Users"),
    ]

    ACTION_CREATE = "create"
    ACTION_DELETE = "delete"
    ACTION_IMPORT = "import"
    ACTION_LOGIN = "login"
    ACTION_REMOVE = "remove"
    ACTION_UPDATE = "update"

    ACTION_CHOICES = [
        (ACTION_CREATE, "Create"),
        (ACTION_DELETE, "Delete"),
        (ACTION_IMPORT, "Import"),
        (ACTION_LOGIN, "Login"),
        (ACTION_REMOVE, "Remove"),
        (ACTION_UPDATE, "Update"),
    ]

    tenant_company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="audit_log_entries",
    )
    actor = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_log_entries",
    )
    event_type = models.CharField(max_length=32, choices=EVENT_TYPE_CHOICES, default=TYPE_NOTE)
    action = models.CharField(max_length=32, choices=ACTION_CHOICES, default=ACTION_CREATE)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    target_type = models.CharField(max_length=64, blank=True)
    target_id = models.CharField(max_length=64, blank=True)
    target_label = models.CharField(max_length=255, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.title} ({self.tenant_company_id})"

