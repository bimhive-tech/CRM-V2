from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Deal(models.Model):
    tenant_company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="deals")
    company = models.ForeignKey("crm.CRMCompany", on_delete=models.CASCADE, related_name="deals")
    contact_link = models.ForeignKey(
        "crm.CRMContactCompanyLink",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deals",
    )
    pipeline = models.ForeignKey("pipelines.Pipeline", on_delete=models.CASCADE, related_name="deals")
    owner = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_deals")
    name = models.CharField(max_length=255)
    stage = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0.00"))
    probability = models.PositiveSmallIntegerField(default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    expected_close_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    stage_entered_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["stage", "-amount", "name", "id"]

    def __str__(self):
        return self.name

