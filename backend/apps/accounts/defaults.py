from django.db.models import Q

from apps.accounts.models import Role, UserRole
from apps.accounts.permission_catalog import SYSTEM_ROLE_DEFAULTS
from apps.companies.models import Company


DEFAULT_COMPANY_ROLE_DEFINITIONS = [
    {
        "slug": UserRole.COMPANY_ADMIN,
        "name": "Company Admin",
        "description": "Default company administrator role.",
        "permissions": SYSTEM_ROLE_DEFAULTS[UserRole.COMPANY_ADMIN],
    },
    {
        "slug": UserRole.USER,
        "name": "User",
        "description": "Default company user role.",
        "permissions": SYSTEM_ROLE_DEFAULTS[UserRole.USER],
    },
]


def ensure_default_company_roles(company):
    created_roles = []

    for definition in DEFAULT_COMPANY_ROLE_DEFINITIONS:
        role = Role.objects.filter(company=company, slug=definition["slug"]).order_by("id").first()
        if role is None:
            role = Role.objects.create(
                company=company,
                slug=definition["slug"],
                name=definition["name"],
                description=definition["description"],
                permissions=definition["permissions"],
                is_system=False,
            )

        next_fields = []
        if role.name != definition["name"]:
            role.name = definition["name"]
            next_fields.append("name")
        if role.description != definition["description"]:
            role.description = definition["description"]
            next_fields.append("description")
        if role.permissions != definition["permissions"]:
            role.permissions = definition["permissions"]
            next_fields.append("permissions")
        if role.is_system:
            role.is_system = False
            next_fields.append("is_system")

        if next_fields:
            role.save(update_fields=next_fields)

        duplicates = Role.objects.filter(company=company, slug=definition["slug"]).exclude(id=role.id)
        if duplicates.exists():
            duplicate_ids = list(duplicates.values_list("id", flat=True))
            user_links = Role.users.through.objects.filter(role_id__in=duplicate_ids)
            for user_id in user_links.values_list("user_id", flat=True).distinct():
                Role.users.through.objects.get_or_create(user_id=user_id, role_id=role.id)
            duplicates.delete()

        created_roles.append(role)

    return created_roles


def cleanup_legacy_default_roles(company=None):
    target_companies = [company] if company is not None else list(Company.objects.all().order_by("id"))

    for definition in DEFAULT_COMPANY_ROLE_DEFINITIONS:
        legacy_roles = list(Role.objects.filter(company__isnull=True, slug=definition["slug"]).order_by("id"))
        if not legacy_roles:
            continue

        for target_company in target_companies:
            target_role = Role.objects.filter(company=target_company, slug=definition["slug"]).order_by("id").first()
            if target_role is None:
                ensure_default_company_roles(target_company)
                target_role = Role.objects.filter(company=target_company, slug=definition["slug"]).order_by("id").first()
            if target_role is None:
                continue

            users = (
                legacy_roles[0].users.model.objects.filter(
                    Q(company=target_company) | Q(companies=target_company),
                    roles__in=legacy_roles,
                )
                .distinct()
            )
            for user in users:
                user.roles.add(target_role)
                user.roles.remove(*legacy_roles)

        still_assigned = Role.users.through.objects.filter(role_id__in=[role.id for role in legacy_roles]).exists()
        if not still_assigned:
            Role.objects.filter(id__in=[role.id for role in legacy_roles]).delete()
