from django.db import models
from django.utils import timezone


class QuarterlyTarget(models.Model):
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="quarterly_targets")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="quarterly_targets")
    year = models.PositiveIntegerField()
    quarter = models.PositiveSmallIntegerField()
    target_value = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_quarterly_targets",
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-year", "-quarter", "user__full_name", "user__email"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "user", "year", "quarter"],
                name="unique_quarterly_target_per_user_and_period",
            ),
            models.CheckConstraint(
                check=models.Q(quarter__gte=1) & models.Q(quarter__lte=4),
                name="quarterly_target_valid_quarter",
            ),
        ]

    def __str__(self):
        return f"{self.user} - Q{self.quarter} {self.year}"
