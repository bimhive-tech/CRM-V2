from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Company(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    is_platform_owner = models.BooleanField(default=False)
    owner_name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    phone_number = models.CharField(max_length=64, blank=True)
    phone_numbers = models.JSONField(default=list, blank=True)
    website = models.URLField(blank=True)
    address = models.TextField(blank=True)
    address_country = models.CharField(max_length=128, blank=True)
    address_state = models.CharField(max_length=128, blank=True)
    address_line = models.TextField(blank=True)
    employee_count = models.PositiveIntegerField(null=True, blank=True)
    logo_key = models.CharField(max_length=512, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "companies"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.slug = slugify(self.name)
        cleaned_numbers = [str(number).strip() for number in self.phone_numbers if str(number).strip()]
        self.phone_numbers = cleaned_numbers
        self.phone_number = cleaned_numbers[0] if cleaned_numbers else self.phone_number.strip()
        composed_address = ", ".join(
            part for part in [self.address_line.strip(), self.address_state.strip(), self.address_country.strip()] if part
        )
        self.address = composed_address if composed_address else self.address.strip()
        super().save(*args, **kwargs)
