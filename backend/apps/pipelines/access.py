from django.db.models import Q

from apps.pipelines.models import Pipeline, PipelineMember, PipelineStatus


def company_ids_for_user(user):
    ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in ids:
        ids.append(user.company_id)
    return ids


def accessible_pipelines_queryset(user):
    queryset = Pipeline.objects.select_related("company", "created_by").prefetch_related("statuses", "memberships")
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


def pipeline_access_flags(user, pipeline):
    is_platform_admin = getattr(user, "is_platform_admin", False)
    is_company_admin = getattr(user, "is_company_admin", False)
    is_creator = bool(user and getattr(user, "id", None) and pipeline.created_by_id == user.id)
    membership = get_pipeline_membership(user, pipeline)
    can_view = bool(
        is_platform_admin
        or is_company_admin
        or is_creator
        or membership is not None
    )

    return {
        "can_view": can_view,
        "can_invite_members": bool(is_platform_admin or is_company_admin or is_creator or (membership and membership.can_invite_members)),
        "can_edit_pipeline": bool(is_platform_admin or is_company_admin or is_creator or (membership and membership.can_edit_pipeline)),
        "can_delete_pipeline": bool(is_platform_admin or is_company_admin or is_creator or (membership and membership.can_delete_pipeline)),
        "can_manage_statuses": bool(is_platform_admin or is_company_admin or is_creator or (membership and membership.can_manage_statuses)),
        "is_creator": is_creator,
    }


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


def inviteable_pipelines_queryset(user):
    queryset = accessible_pipelines_queryset(user)
    if getattr(user, "is_platform_admin", False) or getattr(user, "is_company_admin", False):
        return queryset
    return queryset.filter(
        Q(created_by=user) | Q(memberships__user=user, memberships__can_invite_members=True)
    ).distinct()


def update_pipeline_membership(pipeline, user, permissions):
    membership, _ = PipelineMember.objects.update_or_create(
        pipeline=pipeline,
        user=user,
        defaults={
            "can_invite_members": bool(permissions.get("can_invite_members")),
            "can_edit_pipeline": bool(permissions.get("can_edit_pipeline")),
            "can_delete_pipeline": bool(permissions.get("can_delete_pipeline")),
            "can_manage_statuses": bool(permissions.get("can_manage_statuses")),
        },
    )
    return membership
