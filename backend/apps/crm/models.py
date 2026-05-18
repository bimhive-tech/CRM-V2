from django.db import models
from django.utils import timezone


class CRMCompany(models.Model):
    tenant_company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="crm_companies")
    name = models.CharField(max_length=255)
    owner_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    linkedin_url = models.URLField(blank=True)
    phone_number = models.CharField(max_length=64, blank=True)
    phone_numbers = models.JSONField(default=list, blank=True)
    address = models.TextField(blank=True)
    address_country = models.CharField(max_length=128, blank=True)
    address_state = models.CharField(max_length=128, blank=True)
    address_line = models.TextField(blank=True)
    employee_count = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["tenant_company", "name"], name="unique_crm_company_name_per_tenant"),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        cleaned_numbers = [str(number).strip() for number in self.phone_numbers if str(number).strip()]
        self.phone_numbers = cleaned_numbers
        self.phone_number = cleaned_numbers[0] if cleaned_numbers else self.phone_number.strip()
        composed_address = ", ".join(
            part for part in [self.address_line.strip(), self.address_state.strip(), self.address_country.strip()] if part
        )
        self.address = composed_address if composed_address else self.address.strip()
        super().save(*args, **kwargs)


class CRMContact(models.Model):
    tenant_company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="crm_contacts")
    company = models.ForeignKey(CRMCompany, on_delete=models.CASCADE, related_name="contacts")
    owner = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_crm_contacts")
    full_name = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=64)
    status = models.CharField(max_length=255, default="Lead")
    notes = models.TextField(blank=True)
    last_touch = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["full_name", "email"]
        constraints = [
            models.UniqueConstraint(fields=["email", "company"], name="unique_crm_contact_email_per_company"),
        ]

    def __str__(self):
        return self.full_name
