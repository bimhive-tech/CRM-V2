from rest_framework import generics, permissions
from rest_framework.response import Response

from apps.auditlog.models import AuditLogEntry
from apps.auditlog.serializers import AuditLogCreateSerializer, AuditLogEntrySerializer
from apps.auditlog.services import audit_log_queryset_for_user, default_company_for_user, log_audit_event
from config.pagination import StandardResultsSetPagination


class AuditLogListCreateView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get(self, request):
        queryset = audit_log_queryset_for_user(request.user)
        current_company = default_company_for_user(request.user)
        if current_company is not None:
            queryset = queryset.filter(tenant_company=current_company)
        event_type = request.query_params.get("event_type", "").strip()
        target_type = request.query_params.get("target_type", "").strip().lower()
        target_id = request.query_params.get("target_id", "").strip()
        if event_type:
            queryset = queryset.filter(event_type=event_type)
        if target_type:
            queryset = queryset.filter(target_type=target_type)
        if target_id:
            queryset = queryset.filter(target_id=target_id)

        page = self.paginate_queryset(queryset)
        serializer = AuditLogEntrySerializer(page, many=True)
        return self.get_paginated_response(
            {
                "results": serializer.data,
                "filters": [
                    {"value": "", "label": "All types"},
                    *[
                        {"value": value, "label": label}
                        for value, label in AuditLogEntry.EVENT_TYPE_CHOICES
                    ],
                ],
            }
        )

    def post(self, request):
        serializer = AuditLogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        current_company = default_company_for_user(request.user)
        entry = log_audit_event(
            request.user,
            event_type=serializer.validated_data["event_type"],
            action=AuditLogEntry.ACTION_CREATE,
            title=serializer.validated_data["title"],
            description=serializer.validated_data.get("description", ""),
            company=current_company,
        )
        return Response(AuditLogEntrySerializer(entry).data, status=201)
