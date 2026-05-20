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


def company_ids_for_user(user):
    ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in ids:
        ids.append(user.company_id)
    return ids


def accessible_pipelines_queryset(user):
    queryset = Pipeline.objects.select_related("company", "created_by").prefetch_related("statuses", "memberships", "memberships__user")
    if getattr(user, "is_platform_admin", False):
        return queryset
    if getattr(user, "is_company_admin", False):
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
    can_view = bool(is_platform_admin or is_company_admin or is_creator or membership is not None)

    flags = {
        "can_view": can_view,
        "is_creator": is_creator,
        "has_full_access": bool(is_platform_admin or is_company_admin or is_creator or _membership_allows(membership, "has_full_access")),
    }
    for field in PIPELINE_MEMBER_PERMISSION_FIELDS:
        flags[field] = bool(is_platform_admin or is_company_admin or is_creator or _membership_allows(membership, field))
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
