from django.db import models
from django.utils import timezone


class RecordActivity(models.Model):
    TARGET_CONTACT = "contact"
    TARGET_COMPANY = "company"
    TARGET_DEAL = "deal"
    TARGET_CHOICES = [
      (TARGET_CONTACT, "Contact"),
      (TARGET_COMPANY, "Company"),
      (TARGET_DEAL, "Project"),
    ]

    KIND_NOTE = "note"
    KIND_TASK = "task"
    KIND_MEETING = "meeting"
    KIND_CHOICES = [
      (KIND_NOTE, "Note"),
      (KIND_TASK, "Task"),
      (KIND_MEETING, "Meeting"),
    ]

    target_type = models.CharField(max_length=16, choices=TARGET_CHOICES)
    contact = models.ForeignKey(
        "crm.CRMContactCompanyLink",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="record_activities",
    )
    company = models.ForeignKey(
        "crm.CRMCompany",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="record_activities",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="record_activities",
    )
    kind = models.CharField(max_length=16, choices=KIND_CHOICES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    activity_date = models.DateField(default=timezone.localdate)
    is_done = models.BooleanField(default=False)
    position = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_record_activities",
    )
    updated_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_record_activities",
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["kind", "position", "-activity_date", "-created_at", "-id"]

    def save(self, *args, **kwargs):
        self.title = (self.title or "").strip()
        self.description = (self.description or "").strip()
        super().save(*args, **kwargs)

    @property
    def target_id(self):
        if self.contact_id:
            return self.contact_id
        if self.company_id:
            return self.company_id
        if self.deal_id:
            return self.deal_id
        return None

