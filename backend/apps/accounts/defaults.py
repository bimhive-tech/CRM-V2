from apps.accounts.models import Role, UserRole
from apps.accounts.permission_catalog import SYSTEM_ROLE_DEFAULTS


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
        role, _ = Role.objects.get_or_create(
            company=company,
            slug=definition["slug"],
            defaults={
                "name": definition["name"],
                "description": definition["description"],
                "permissions": definition["permissions"],
                "is_system": False,
            },
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

        created_roles.append(role)

    return created_roles
