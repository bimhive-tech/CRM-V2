from django.db.models import Q

from apps.pipelines.models import Pipeline, PipelineMember, PipelineStatus


PIPELINE_MEMBER_PERMISSION_FIELDS = [
    "can_invite_members",
    "can_edit_pipeline",
    "can_delete_pipeline",
    "can_manage_statuses",
    "can_view_contacts",
    "can_move_contacts",
    "can_manage_contacts",
    "can_view_companies",
    "can_manage_companies",
    "can_view_deals",
    "can_move_deals",
    "can_manage_deals",
]

GLOBAL_PIPELINE_PERMISSION_CODES = {
    "pipelines.view",
    "pipelines.create",
    "pipelines.update",
    "pipelines.delete",
    "pipelines.manage_members",
    "pipeline_statuses.manage",
}

GLOBAL_CONTACT_PERMISSION_CODES = {
    "contacts.view",
    "contacts.create",
    "contacts.update",
    "contacts.delete",
    "contacts.import_execute",
}

GLOBAL_COMPANY_PERMISSION_CODES = {
    "crm_companies.view",
    "crm_companies.create",
    "crm_companies.update",
    "crm_companies.delete",
}

GLOBAL_DEAL_PERMISSION_CODES = {
    "deals.view",
    "deals.create",
    "deals.update",
    "deals.delete",
}


def company_ids_for_user(user):
    ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in ids:
        ids.append(user.company_id)
    return ids


def _has_any_permission(user, codes):
    if not user or not getattr(user, "is_authenticated", False):
        return False
    return any(user.has_app_permission(code) for code in codes)


def _has_company_wide_pipeline_access(user, kind=None):
    codes = set(GLOBAL_PIPELINE_PERMISSION_CODES)
    if kind == Pipeline.KIND_CONTACTS:
        codes.update(GLOBAL_CONTACT_PERMISSION_CODES)
        codes.update(GLOBAL_COMPANY_PERMISSION_CODES)
    elif kind == Pipeline.KIND_DEALS:
        codes.update(GLOBAL_DEAL_PERMISSION_CODES)
        codes.update(GLOBAL_COMPANY_PERMISSION_CODES)
    else:
        codes.update(GLOBAL_CONTACT_PERMISSION_CODES)
        codes.update(GLOBAL_COMPANY_PERMISSION_CODES)
        codes.update(GLOBAL_DEAL_PERMISSION_CODES)
    return _has_any_permission(user, codes)


def accessible_pipelines_queryset(user):
    queryset = Pipeline.objects.select_related("company", "created_by").prefetch_related("statuses", "memberships", "memberships__user")
    if getattr(user, "is_platform_admin", False):
        return queryset
    if getattr(user, "is_company_admin", False):
        return queryset.filter(company_id__in=company_ids_for_user(user))
    if _has_company_wide_pipeline_access(user):
        return queryset.filter(company_id__in=company_ids_for_user(user))
    return queryset.filter(
        Q(created_by=user) | Q(memberships__user=user),
        company_id__in=company_ids_for_user(user),
    ).distinct()


def accessible_pipeline_statuses_queryset(user):
    queryset = PipelineStatus.objects.select_related("pipeline", "pipeline__company", "pipeline__created_by")
    if getattr(user, "is_platform_admin", False):
        return queryset
    if getattr(user, "is_company_admin", False):
        return queryset.filter(pipeline__company_id__in=company_ids_for_user(user))
    if _has_company_wide_pipeline_access(user):
        return queryset.filter(pipeline__company_id__in=company_ids_for_user(user))
    return queryset.filter(
        Q(pipeline__created_by=user) | Q(pipeline__memberships__user=user),
        pipeline__company_id__in=company_ids_for_user(user),
    ).distinct()


def get_pipeline_membership(user, pipeline):
    if not user or not getattr(user, "is_authenticated", False):
        return None
    if getattr(user, "is_platform_admin", False) or getattr(user, "is_company_admin", False):
        return None
    if pipeline.created_by_id == user.id:
        return None
    return pipeline.memberships.filter(user=user).first()


def _membership_allows(membership, field):
    if membership is None:
        return False
    return bool(membership.has_full_access or getattr(membership, field, False))


def pipeline_access_flags(user, pipeline):
    is_platform_admin = getattr(user, "is_platform_admin", False)
    is_company_admin = getattr(user, "is_company_admin", False)
    is_creator = bool(user and getattr(user, "id", None) and pipeline.created_by_id == user.id)
    membership = get_pipeline_membership(user, pipeline)
    has_global_pipeline_access = _has_company_wide_pipeline_access(user, pipeline.kind)
    can_view = bool(is_platform_admin or is_company_admin or is_creator or membership is not None or has_global_pipeline_access)
    can_manage_contacts_globally = _has_any_permission(user, {"contacts.create", "contacts.update", "contacts.delete"})
    can_manage_companies_globally = _has_any_permission(user, {"crm_companies.create", "crm_companies.update", "crm_companies.delete"})
    can_manage_deals_globally = _has_any_permission(user, {"deals.create", "deals.update", "deals.delete"})

    flags = {
        "can_view": can_view,
        "is_creator": is_creator,
        "has_full_access": bool(is_platform_admin or is_company_admin or is_creator or _membership_allows(membership, "has_full_access")),
    }
    flags["can_invite_members"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or user.has_app_permission("pipelines.manage_members")
        or _membership_allows(membership, "can_invite_members")
    )
    flags["can_edit_pipeline"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or user.has_app_permission("pipelines.update")
        or _membership_allows(membership, "can_edit_pipeline")
    )
    flags["can_delete_pipeline"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or user.has_app_permission("pipelines.delete")
        or _membership_allows(membership, "can_delete_pipeline")
    )
    flags["can_manage_statuses"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or user.has_app_permission("pipeline_statuses.manage")
        or _membership_allows(membership, "can_manage_statuses")
    )
    flags["can_view_contacts"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or _has_any_permission(user, {"contacts.view", "contacts.create", "contacts.update", "contacts.delete"})
        or _membership_allows(membership, "can_view_contacts")
    )
    flags["can_move_contacts"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or user.has_app_permission("contacts.update")
        or _membership_allows(membership, "can_move_contacts")
    )
    flags["can_manage_contacts"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or can_manage_contacts_globally
        or _membership_allows(membership, "can_manage_contacts")
    )
    flags["can_view_companies"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or _has_any_permission(user, {"crm_companies.view", "crm_companies.create", "crm_companies.update", "crm_companies.delete"})
        or _membership_allows(membership, "can_view_companies")
    )
    flags["can_manage_companies"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or can_manage_companies_globally
        or _membership_allows(membership, "can_manage_companies")
    )
    flags["can_view_deals"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or _has_any_permission(user, {"deals.view", "deals.create", "deals.update", "deals.delete"})
        or _membership_allows(membership, "can_view_deals")
    )
    flags["can_move_deals"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or user.has_app_permission("deals.update")
        or _membership_allows(membership, "can_move_deals")
    )
    flags["can_manage_deals"] = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or can_manage_deals_globally
        or _membership_allows(membership, "can_manage_deals")
    )
    return flags


def user_can_access_pipeline(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_view"]


def user_can_invite_to_pipeline(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_invite_members"]


def user_can_edit_pipeline(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_edit_pipeline"]


def user_can_delete_pipeline(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_delete_pipeline"]


def user_can_manage_pipeline_statuses(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_manage_statuses"]


def user_can_view_pipeline_contacts(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_view_contacts"]


def user_can_move_pipeline_contacts(user, pipeline):
    flags = pipeline_access_flags(user, pipeline)
    return bool(flags["can_move_contacts"] or flags["can_manage_contacts"])


def user_can_manage_pipeline_contacts(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_manage_contacts"]


def user_can_view_pipeline_companies(user, pipeline):
    flags = pipeline_access_flags(user, pipeline)
    return bool(flags["can_view_companies"] or flags["can_manage_companies"])


def user_can_manage_pipeline_companies(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_manage_companies"]


def user_can_view_pipeline_deals(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_view_deals"]


def user_can_move_pipeline_deals(user, pipeline):
    flags = pipeline_access_flags(user, pipeline)
    return bool(flags["can_move_deals"] or flags["can_manage_deals"])


def user_can_manage_pipeline_deals(user, pipeline):
    return pipeline_access_flags(user, pipeline)["can_manage_deals"]


def inviteable_pipelines_queryset(user):
    queryset = accessible_pipelines_queryset(user)
    if getattr(user, "is_platform_admin", False) or getattr(user, "is_company_admin", False):
        return queryset
    return queryset.filter(
        Q(created_by=user) | Q(memberships__user=user, memberships__has_full_access=True) | Q(memberships__user=user, memberships__can_invite_members=True)
    ).distinct()


def pipelines_with_contact_visibility_queryset(user):
    queryset = accessible_pipelines_queryset(user)
    if getattr(user, "is_platform_admin", False) or getattr(user, "is_company_admin", False):
        return queryset
    if _has_any_permission(user, {"contacts.view", "contacts.create", "contacts.update", "contacts.delete"}):
        return queryset.filter(company_id__in=company_ids_for_user(user))
    return queryset.filter(
        Q(created_by=user)
        | Q(memberships__user=user, memberships__has_full_access=True)
        | Q(memberships__user=user, memberships__can_view_contacts=True)
        | Q(memberships__user=user, memberships__can_move_contacts=True)
        | Q(memberships__user=user, memberships__can_manage_contacts=True)
    ).distinct()


def pipelines_with_company_visibility_queryset(user):
    queryset = accessible_pipelines_queryset(user)
    if getattr(user, "is_platform_admin", False) or getattr(user, "is_company_admin", False):
        return queryset
    if _has_any_permission(user, {"crm_companies.view", "crm_companies.create", "crm_companies.update", "crm_companies.delete"}):
        return queryset.filter(company_id__in=company_ids_for_user(user))
    return queryset.filter(
        Q(created_by=user)
        | Q(memberships__user=user, memberships__has_full_access=True)
        | Q(memberships__user=user, memberships__can_view_companies=True)
        | Q(memberships__user=user, memberships__can_manage_companies=True)
    ).distinct()


def pipelines_with_deal_visibility_queryset(user):
    queryset = accessible_pipelines_queryset(user)
    if getattr(user, "is_platform_admin", False) or getattr(user, "is_company_admin", False):
        return queryset
    if _has_any_permission(user, {"deals.view", "deals.create", "deals.update", "deals.delete"}):
        return queryset.filter(company_id__in=company_ids_for_user(user))
    return queryset.filter(
        Q(created_by=user)
        | Q(memberships__user=user, memberships__has_full_access=True)
        | Q(memberships__user=user, memberships__can_view_deals=True)
        | Q(memberships__user=user, memberships__can_move_deals=True)
        | Q(memberships__user=user, memberships__can_manage_deals=True)
    ).distinct()


def normalize_pipeline_member_permissions(permissions):
    defaults = {field: bool(permissions.get(field)) for field in PIPELINE_MEMBER_PERMISSION_FIELDS}
    defaults["has_full_access"] = bool(permissions.get("has_full_access"))
    if defaults["has_full_access"]:
        for field in PIPELINE_MEMBER_PERMISSION_FIELDS:
            defaults[field] = True
    return defaults


def update_pipeline_membership(pipeline, user, permissions):
    membership, _ = PipelineMember.objects.update_or_create(
        pipeline=pipeline,
        user=user,
        defaults=normalize_pipeline_member_permissions(permissions),
    )
    return membership
