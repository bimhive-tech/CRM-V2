import os

from django.core.management.base import BaseCommand

from apps.accounts.defaults import cleanup_legacy_default_roles, ensure_default_company_roles
from apps.accounts.models import Role, User, UserRole
from apps.companies.models import Company


class Command(BaseCommand):
    help = "Create or update the initial platform admin account."

    def handle(self, *args, **options):
        email = os.getenv("PLATFORM_ADMIN_EMAIL", "admin@bimhive.com")
        password = os.getenv("PLATFORM_ADMIN_PASSWORD", "Admin12345!")
        full_name = os.getenv("PLATFORM_ADMIN_NAME", "Platform Admin")
        admin_company, _ = Company.objects.get_or_create(
            name="Administration",
            defaults={"is_active": True, "is_platform_owner": True},
        )
        if not admin_company.is_platform_owner:
            admin_company.is_platform_owner = True
            admin_company.save(update_fields=["is_platform_owner"])
        ensure_default_company_roles(admin_company)
        cleanup_legacy_default_roles()

        platform_role, _ = Role.objects.get_or_create(
            slug=UserRole.PLATFORM_ADMIN,
            defaults={
                "name": "Platform Admin",
                "description": "Full platform access.",
                "is_system": True,
                "permissions": [],
            },
        )
        next_fields = []
        if platform_role.permissions:
            platform_role.permissions = []
            next_fields.append("permissions")
        if not platform_role.is_system:
            platform_role.is_system = True
            next_fields.append("is_system")
        if next_fields:
            platform_role.save(update_fields=next_fields)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "full_name": full_name,
                "role": UserRole.PLATFORM_ADMIN,
                "company": admin_company,
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
            },
        )

        user.full_name = full_name
        user.role = UserRole.PLATFORM_ADMIN
        user.company = admin_company
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()
        user.roles.add(platform_role)
        user.companies.add(admin_company)

        message = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(f"{message} platform admin: {email}"))
