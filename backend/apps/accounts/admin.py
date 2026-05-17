from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from apps.accounts.models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ["email"]
    list_display = ["email", "full_name", "role", "company", "is_active", "is_staff"]
    list_filter = ["role", "is_active", "is_staff", "company"]
    search_fields = ["email", "full_name"]

    fieldsets = (
        ("Account", {"fields": ("email", "password")}),
        ("Profile", {"fields": ("full_name", "company", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login",)}),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "full_name", "company", "role", "password1", "password2", "is_staff", "is_superuser"),
            },
        ),
    )

    readonly_fields = ["last_login"]
