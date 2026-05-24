from django.db.models import Max
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.auditlog.models import AuditLogEntry
from apps.auditlog.services import log_audit_event
from apps.attachments.views import ensure_can_manage_target, resolve_target
from apps.recordactivity.models import RecordActivity
from apps.recordactivity.serializers import RecordActivitySerializer, RecordActivityWriteSerializer


def activity_queryset_for_target(target_type, target_id):
    return RecordActivity.objects.select_related("created_by", "updated_by").filter(
        **{f"{target_type}_id": target_id}
    )


def _activity_kind_label(kind):
    return "task" if kind == RecordActivity.KIND_TASK else "meeting" if kind == RecordActivity.KIND_MEETING else "note"


def log_record_activity_event(actor, target, activity, action, *, previous_done=None):
    kind_label = _activity_kind_label(activity.kind)
    if activity.kind == RecordActivity.KIND_TASK and action == AuditLogEntry.ACTION_UPDATE and previous_done is not None and previous_done != activity.is_done:
        title = "Completed task" if activity.is_done else "Reopened task"
    elif action == AuditLogEntry.ACTION_CREATE:
        title = f"Created {kind_label}"
    elif action == AuditLogEntry.ACTION_DELETE:
        title = f"Deleted {kind_label}"
    else:
        title = f"Updated {kind_label}"

    log_audit_event(
        actor,
        event_type=AuditLogEntry.TYPE_NOTE,
        action=action,
        title=title,
        description=activity.title,
        target=target,
        metadata={
            "activity_kind": activity.kind,
            "activity_id": activity.id,
            "is_done": activity.is_done,
            "activity_date": activity.activity_date.isoformat() if activity.activity_date else "",
        },
    )


class RecordActivityListCreateView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_target(self, request):
        target_type = (request.query_params.get("target_type") or request.data.get("target_type") or "").strip()
        target_id = (request.query_params.get("target_id") or request.data.get("target_id") or "").strip()
        if not target_type or not target_id:
            raise ValidationError({"detail": "Activity target_type and target_id are required."})
        target = resolve_target(request.user, target_type, target_id)
        return target_type, target

    def get(self, request):
        target_type, target = self.get_target(request)
        kind = (request.query_params.get("kind") or "").strip()
        queryset = activity_queryset_for_target(target_type, target.id)
        if kind:
            queryset = queryset.filter(kind=kind)
        return Response(RecordActivitySerializer(queryset, many=True).data)

    def post(self, request):
        target_type, target = self.get_target(request)
        ensure_can_manage_target(request.user, target_type, target)
        serializer = RecordActivityWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        max_position = (
            activity_queryset_for_target(target_type, target.id)
            .filter(kind=serializer.validated_data["kind"])
            .aggregate(value=Max("position"))
            .get("value")
        )
        next_position = serializer.validated_data.get("position")
        if next_position is None:
            next_position = (max_position or 0) + 1
        activity = serializer.save(
            target_type=target_type,
            created_by=request.user,
            updated_by=request.user,
            position=next_position,
            **{target_type: target},
        )
        log_record_activity_event(request.user, target, activity, AuditLogEntry.ACTION_CREATE)
        return Response(RecordActivitySerializer(activity).data, status=201)


class RecordActivityDetailView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        activity = generics.get_object_or_404(
            RecordActivity.objects.select_related("created_by", "updated_by", "contact__pipeline", "company", "deal__pipeline"),
            pk=self.kwargs["pk"],
        )
        target = resolve_target(self.request.user, activity.target_type, activity.target_id)
        return activity, target

    def patch(self, request, pk):
        activity, target = self.get_object()
        ensure_can_manage_target(request.user, activity.target_type, target)
        previous_done = activity.is_done
        serializer = RecordActivityWriteSerializer(activity, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = serializer.save(updated_by=request.user)
        log_record_activity_event(request.user, target, updated, AuditLogEntry.ACTION_UPDATE, previous_done=previous_done)
        return Response(RecordActivitySerializer(updated).data)

    def delete(self, request, pk):
        activity, target = self.get_object()
        ensure_can_manage_target(request.user, activity.target_type, target)
        log_record_activity_event(request.user, target, activity, AuditLogEntry.ACTION_DELETE)
        activity.delete()
        return Response(status=204)
