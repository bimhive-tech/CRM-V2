from django.urls import path

from apps.targets.views import MyTargetSummaryView, QuarterlyTargetDetailView, QuarterlyTargetListCreateView, TargetSummaryView


urlpatterns = [
    path("", QuarterlyTargetListCreateView.as_view(), name="target-list"),
    path("summary/", TargetSummaryView.as_view(), name="target-summary"),
    path("my-summary/", MyTargetSummaryView.as_view(), name="my-target-summary"),
    path("<int:pk>/", QuarterlyTargetDetailView.as_view(), name="target-detail"),
]
