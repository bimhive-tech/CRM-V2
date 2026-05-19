from django.urls import path

from apps.masterdata.views import CurrencyDetailView, CurrencyListCreateView, PipelineStatusTemplateDetailView, PipelineStatusTemplateListCreateView


urlpatterns = [
    path("currencies/", CurrencyListCreateView.as_view(), name="currencies"),
    path("currencies/<int:pk>/", CurrencyDetailView.as_view(), name="currency-detail"),
    path("pipeline-status-templates/", PipelineStatusTemplateListCreateView.as_view(), name="pipeline-status-templates"),
    path("pipeline-status-templates/<int:pk>/", PipelineStatusTemplateDetailView.as_view(), name="pipeline-status-template-detail"),
]
