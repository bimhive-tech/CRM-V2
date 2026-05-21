from django.urls import path

from apps.attachments.views import AttachmentDetailView, AttachmentDownloadView, AttachmentListCreateView


urlpatterns = [
    path("", AttachmentListCreateView.as_view(), name="attachments"),
    path("<int:pk>/", AttachmentDetailView.as_view(), name="attachment-detail"),
    path("<int:pk>/download/", AttachmentDownloadView.as_view(), name="attachment-download"),
]

