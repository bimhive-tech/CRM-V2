from django.urls import path

from apps.auditlog.views import AuditLogListCreateView


urlpatterns = [
    path("", AuditLogListCreateView.as_view(), name="audit-log-list"),
]
