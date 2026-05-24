from django.urls import path

from apps.recordactivity.views import RecordActivityDetailView, RecordActivityListCreateView


urlpatterns = [
    path("", RecordActivityListCreateView.as_view(), name="record-activity-list"),
    path("<int:pk>/", RecordActivityDetailView.as_view(), name="record-activity-detail"),
]

