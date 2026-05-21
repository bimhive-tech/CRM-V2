import os
import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


def attachment_upload_to(instance, filename):
    extension = os.path.splitext(filename or "")[1].lower()
    target_type = instance.target_type or "record"
    target_id = instance.target_id or "unassigned"
    return f"attachments/{target_type}/{target_id}/{uuid.uuid4().hex}{extension}"


class Attachment(models.Model):
    TARGET_CONTACT = "contact"
    TARGET_COMPANY = "company"
    TARGET_DEAL = "deal"
    TARGET_CHOICES = [
        (TARGET_CONTACT, "Contact"),
        (TARGET_COMPANY, "Company"),
        (TARGET_DEAL, "Deal"),
    ]

    target_type = models.CharField(max_length=16, choices=TARGET_CHOICES)
    contact = models.ForeignKey(
        "crm.CRMContactCompanyLink",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attachments",
    )
    company = models.ForeignKey(
        "crm.CRMCompany",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attachments",
    )
    deal = models.ForeignKey(
        "deals.Deal",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="attachments",
    )
    uploaded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_attachments",
    )
    file = models.FileField(upload_to=attachment_upload_to, max_length=512)
    original_name = models.CharField(max_length=255)
    content_type = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["-created_at", "-id"]

    def clean(self):
        targets = [
            bool(self.contact_id),
            bool(self.company_id),
            bool(self.deal_id),
        ]
        if sum(targets) != 1:
            raise ValidationError("Exactly one attachment target must be set.")

        if self.contact_id and self.target_type != self.TARGET_CONTACT:
            raise ValidationError("Contact attachments must use the contact target type.")
        if self.company_id and self.target_type != self.TARGET_COMPANY:
            raise ValidationError("Company attachments must use the company target type.")
        if self.deal_id and self.target_type != self.TARGET_DEAL:
            raise ValidationError("Deal attachments must use the deal target type.")

    def save(self, *args, **kwargs):
        self.full_clean()
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

