from apps.auditlog.models import AuditLogEntry


def _company_ids_for_user(user):
    company_ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in company_ids:
        company_ids.append(user.company_id)
    return company_ids


def default_company_for_user(user):
    if user.company_id:
        return user.company
    return user.companies.order_by("name", "id").first()


def _company_from_target(target):
    if target is None:
        return None
    if hasattr(target, "tenant_company") and target.tenant_company_id:
        return target.tenant_company
    if hasattr(target, "company") and getattr(target, "company_id", None):
        return target.company
    return None


def _target_type(target):
    if target is None:
        return ""
    return target.__class__.__name__.lower()


def _target_id(target):
    if target is None or getattr(target, "pk", None) is None:
        return ""
    return str(target.pk)


def _target_label(target):
    if target is None:
        return ""
    return str(target)


def log_audit_event(actor, *, event_type, action, title, description="", target=None, company=None, metadata=None):
    resolved_company = company or _company_from_target(target) or default_company_for_user(actor)
    if resolved_company is None:
        return None

    return AuditLogEntry.objects.create(
        tenant_company=resolved_company,
        actor=actor,
        event_type=event_type,
        action=action,
        title=title,
        description=description,
        target_type=_target_type(target),
        target_id=_target_id(target),
        target_label=_target_label(target),
        metadata=metadata or {},
    )


def audit_log_queryset_for_user(user):
    return AuditLogEntry.objects.select_related("actor", "tenant_company").filter(
        tenant_company_id__in=_company_ids_for_user(user)
    )

