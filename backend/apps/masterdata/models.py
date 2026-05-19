from django.db import models
from django.utils import timezone


class Currency(models.Model):
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="currencies")
    name = models.CharField(max_length=128)
    symbol = models.CharField(max_length=16, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["company", "name"], name="unique_currency_name_per_company"),
        ]

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        self.symbol = self.symbol.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class PipelineStatusTemplate(models.Model):
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="pipeline_status_templates")
    name = models.CharField(max_length=255)
    color = models.CharField(max_length=7, default="#7C5F35")
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(fields=["company", "name"], name="unique_pipeline_status_template_per_company"),
        ]

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.name}"


class CompanyIndustry(models.Model):
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="company_industries")
    name = models.CharField(max_length=255)
    position = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["position", "id"]
        constraints = [
            models.UniqueConstraint(fields=["company", "name"], name="unique_company_industry_per_company"),
        ]

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.company.name} - {self.name}"
