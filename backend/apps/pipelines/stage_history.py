from django.utils import timezone
from django.utils.dateparse import parse_datetime

FALLBACK_STAGE_COLOR = "#7C5F35"


def resolve_stage_color(pipeline, stage_name, fallback=FALLBACK_STAGE_COLOR):
    if not pipeline or not stage_name:
        return fallback
    status = pipeline.statuses.filter(name=stage_name).first()
    return status.color if status else fallback


def create_stage_history_entry(*, pipeline, stage_name, started_at=None):
    timestamp = started_at or timezone.now()
    return {
        "stage": stage_name or "",
        "pipeline_id": getattr(pipeline, "id", None),
        "stage_color": resolve_stage_color(pipeline, stage_name),
        "started_at": timestamp.isoformat(),
        "ended_at": None,
    }


def ensure_stage_history(history, *, pipeline, stage_name, started_at=None):
    existing = [dict(item) for item in (history or []) if isinstance(item, dict)]
    if existing:
        return existing
    return [create_stage_history_entry(pipeline=pipeline, stage_name=stage_name, started_at=started_at)]


def transition_stage_history(
    history,
    *,
    previous_pipeline,
    previous_stage,
    previous_started_at,
    next_pipeline,
    next_stage,
    changed_at=None,
):
    timestamp = changed_at or timezone.now()
    next_history = ensure_stage_history(
        history,
        pipeline=previous_pipeline,
        stage_name=previous_stage,
        started_at=previous_started_at,
    )
    if next_history and not next_history[-1].get("ended_at"):
        next_history[-1]["ended_at"] = timestamp.isoformat()
    next_history.append(create_stage_history_entry(pipeline=next_pipeline, stage_name=next_stage, started_at=timestamp))
    return next_history


def _format_duration_label(duration_seconds):
    if duration_seconds <= 0:
        return "0m"
    days = duration_seconds // 86400
    hours = (duration_seconds % 86400) // 3600
    minutes = (duration_seconds % 3600) // 60
    if days:
        return f"{days}d {hours}h" if hours else f"{days}d"
    if hours:
        return f"{hours}h {minutes}m" if minutes else f"{hours}h"
    return f"{minutes}m"


def serialize_stage_history(history):
    rows = [dict(item) for item in (history or []) if isinstance(item, dict)]
    serialized = []
    now = timezone.now()

    for index, item in enumerate(rows):
        started_at = parse_datetime(item.get("started_at") or "") if item.get("started_at") else None
        explicit_end = parse_datetime(item.get("ended_at") or "") if item.get("ended_at") else None
        next_start = None
        if index + 1 < len(rows):
            next_item = rows[index + 1]
            next_start = parse_datetime(next_item.get("started_at") or "") if next_item.get("started_at") else None

        effective_end = explicit_end or next_start or now
        duration_seconds = int(max((effective_end - started_at).total_seconds(), 0)) if started_at else 0
        serialized.append(
            {
                "stage": item.get("stage") or "",
                "pipeline_id": item.get("pipeline_id"),
                "stage_color": item.get("stage_color") or FALLBACK_STAGE_COLOR,
                "started_at": started_at.isoformat() if started_at else None,
                "ended_at": explicit_end.isoformat() if explicit_end else None,
                "is_current": explicit_end is None and index == len(rows) - 1,
                "duration_seconds": duration_seconds,
                "duration_label": _format_duration_label(duration_seconds),
            }
        )
    return serialized
