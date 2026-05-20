from django.urls import path

from apps.pipelines.views import (
    PipelineInviteOptionsView,
    PipelineDetailView,
    PipelineListCreateView,
    PipelineMembershipBulkAssignView,
    PipelineMembershipDetailView,
    PipelineMembershipListView,
    PipelineStatusDetailView,
    PipelineStatusListCreateView,
)


urlpatterns = [
    path("invite-options/", PipelineInviteOptionsView.as_view(), name="pipeline-invite-options"),
    path("memberships/", PipelineMembershipListView.as_view(), name="pipeline-memberships"),
    path("memberships/assign/", PipelineMembershipBulkAssignView.as_view(), name="pipeline-memberships-assign"),
    path("memberships/<int:pk>/", PipelineMembershipDetailView.as_view(), name="pipeline-membership-detail"),
    path("", PipelineListCreateView.as_view(), name="pipelines"),
    path("<int:pk>/", PipelineDetailView.as_view(), name="pipeline-detail"),
    path("<int:pipeline_pk>/statuses/", PipelineStatusListCreateView.as_view(), name="pipeline-statuses"),
    path("statuses/<int:pk>/", PipelineStatusDetailView.as_view(), name="pipeline-status-detail"),
]
