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
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["kind", "name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["company", "kind", "name"], name="unique_pipeline_name_per_company_and_kind"),
        ]

    def __str__(self):
        return self.name


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
