PERMISSION_GROUPS = [
    {
        "id": "settings",
        "label": "Settings",
        "permissions": [
            {
                "code": "settings.access",
                "label": "Access settings",
                "description": "Open the settings workspace.",
                "platform_only": False,
            },
        ],
    },
    {
        "id": "company-profile",
        "label": "Company Profile",
        "permissions": [
            {
                "code": "company_profile.view",
                "label": "View company profile",
                "description": "See the current tenant company profile.",
                "platform_only": False,
            },
            {
                "code": "company_profile.update",
                "label": "Edit company profile",
                "description": "Update company profile fields for the current tenant.",
                "platform_only": False,
            },
            {
                "code": "company_profile.upload_logo",
                "label": "Manage company logo",
                "description": "Upload or remove the tenant company logo.",
                "platform_only": False,
            },
        ],
    },
    {
        "id": "users",
        "label": "Users",
        "permissions": [
            {"code": "users.view", "label": "View users", "description": "See users in the current company scope.", "platform_only": False},
            {"code": "users.create", "label": "Create users", "description": "Create new users.", "platform_only": False},
            {"code": "users.update", "label": "Edit users", "description": "Update user profile details.", "platform_only": False},
            {"code": "users.delete", "label": "Delete users", "description": "Remove users.", "platform_only": False},
            {"code": "users.assign_roles", "label": "Assign roles", "description": "Attach custom roles to users.", "platform_only": False},
            {"code": "users.assign_companies", "label": "Assign companies", "description": "Attach users to multiple companies.", "platform_only": False},
        ],
    },
    {
        "id": "roles",
        "label": "Roles",
        "permissions": [
            {"code": "roles.view", "label": "View roles", "description": "See available roles.", "platform_only": False},
            {"code": "roles.create", "label": "Create roles", "description": "Create new custom roles.", "platform_only": False},
            {"code": "roles.update", "label": "Edit roles", "description": "Update role names and descriptions.", "platform_only": False},
            {"code": "roles.delete", "label": "Delete roles", "description": "Delete custom roles.", "platform_only": False},
            {
                "code": "roles.manage_permissions",
                "label": "Manage role permissions",
                "description": "Configure the permission matrix for roles.",
                "platform_only": False,
            },
        ],
    },
    {
        "id": "platform-companies",
        "label": "Platform Companies",
        "permissions": [
            {"code": "companies.view", "label": "View companies", "description": "See all SaaS companies.", "platform_only": True},
            {"code": "companies.create", "label": "Create companies", "description": "Create new SaaS tenant companies.", "platform_only": True},
            {"code": "companies.update", "label": "Edit companies", "description": "Update any SaaS tenant company.", "platform_only": True},
            {"code": "companies.delete", "label": "Delete companies", "description": "Delete SaaS tenant companies.", "platform_only": True},
        ],
    },
    {
        "id": "master-data",
        "label": "Master Data",
        "permissions": [
            {"code": "master_data.view", "label": "View master data", "description": "See company master data lists.", "platform_only": False},
            {
                "code": "master_data.manage_industries",
                "label": "Manage industries",
                "description": "Create, edit, and delete company industries.",
                "platform_only": False,
            },
            {
                "code": "master_data.manage_currencies",
                "label": "Manage currencies",
                "description": "Create, edit, and delete currencies.",
                "platform_only": False,
            },
            {
                "code": "master_data.manage_pipeline_templates",
                "label": "Manage pipeline templates",
                "description": "Manage default pipeline statuses.",
                "platform_only": False,
            },
            {
                "code": "master_data.restore_defaults",
                "label": "Restore defaults",
                "description": "Restore seeded master data defaults.",
                "platform_only": False,
            },
        ],
    },
    {
        "id": "contacts",
        "label": "Contacts",
        "permissions": [
            {"code": "contacts.view", "label": "View contacts", "description": "See contacts.", "platform_only": False},
            {"code": "contacts.create", "label": "Create contacts", "description": "Create contacts.", "platform_only": False},
            {"code": "contacts.update", "label": "Edit contacts", "description": "Update contacts.", "platform_only": False},
            {"code": "contacts.delete", "label": "Delete contacts", "description": "Delete contacts.", "platform_only": False},
            {
                "code": "contacts.import_preview",
                "label": "Preview import",
                "description": "Preview contact import files.",
                "platform_only": False,
            },
            {
                "code": "contacts.import_execute",
                "label": "Run import",
                "description": "Execute contact imports.",
                "platform_only": False,
            },
            {
                "code": "contacts.delete_imported",
                "label": "Delete imported data",
                "description": "Delete imported contacts and linked imported companies.",
                "platform_only": False,
            },
        ],
    },
    {
        "id": "crm-companies",
        "label": "CRM Companies",
        "permissions": [
            {"code": "crm_companies.view", "label": "View CRM companies", "description": "See CRM company records.", "platform_only": False},
            {"code": "crm_companies.create", "label": "Create CRM companies", "description": "Create CRM company records.", "platform_only": False},
            {"code": "crm_companies.update", "label": "Edit CRM companies", "description": "Update CRM company records.", "platform_only": False},
            {"code": "crm_companies.delete", "label": "Delete CRM companies", "description": "Delete CRM company records.", "platform_only": False},
        ],
    },
    {
        "id": "pipelines",
        "label": "Pipelines",
        "permissions": [
            {"code": "pipelines.view", "label": "View pipelines", "description": "See pipelines.", "platform_only": False},
            {"code": "pipelines.create", "label": "Create pipelines", "description": "Create pipelines.", "platform_only": False},
            {"code": "pipelines.update", "label": "Edit pipelines", "description": "Update pipelines.", "platform_only": False},
            {"code": "pipelines.delete", "label": "Delete pipelines", "description": "Delete pipelines.", "platform_only": False},
            {
                "code": "pipeline_statuses.manage",
                "label": "Manage pipeline statuses",
                "description": "Create, edit, reorder, and delete pipeline statuses.",
                "platform_only": False,
            },
        ],
    },
    {
        "id": "deals",
        "label": "Deals",
        "permissions": [
            {"code": "deals.view", "label": "View deals", "description": "See deals.", "platform_only": False},
            {"code": "deals.create", "label": "Create deals", "description": "Create deals.", "platform_only": False},
            {"code": "deals.update", "label": "Edit deals", "description": "Update deals.", "platform_only": False},
            {"code": "deals.delete", "label": "Delete deals", "description": "Delete deals.", "platform_only": False},
        ],
    },
]


def flatten_permission_groups(groups):
    return [permission for group in groups for permission in group["permissions"]]


ALL_PERMISSIONS = flatten_permission_groups(PERMISSION_GROUPS)
ALL_PERMISSION_CODES = {permission["code"] for permission in ALL_PERMISSIONS}
NON_PLATFORM_PERMISSION_CODES = {
    permission["code"] for permission in ALL_PERMISSIONS if not permission["platform_only"]
}


SYSTEM_ROLE_DEFAULTS = {
    "platform_admin": sorted(ALL_PERMISSION_CODES),
    "company_admin": sorted(NON_PLATFORM_PERMISSION_CODES),
    "user": [],
}


def get_visible_permission_groups(user):
    if getattr(user, "is_platform_admin", False):
        return PERMISSION_GROUPS

    visible_groups = []
    for group in PERMISSION_GROUPS:
        permissions = [permission for permission in group["permissions"] if not permission["platform_only"]]
        if permissions:
            visible_groups.append({**group, "permissions": permissions})
    return visible_groups
