from django.db import models
from django.utils import timezone


class Contact(models.Model):
    full_name = models.CharField(max_length=255)
    title = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=64)
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="contacts")
    owner = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="owned_contacts")
    status = models.CharField(max_length=255, default="Lead")
    notes = models.TextField(blank=True)
    last_touch = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["full_name", "email"]
        constraints = [
            models.UniqueConstraint(fields=["email", "company"], name="unique_contact_email_per_company"),
        ]

    def __str__(self):
        return self.full_name
