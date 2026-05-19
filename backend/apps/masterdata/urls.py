from django.urls import path

from apps.masterdata.views import (
    CompanyIndustryDetailView,
    CompanyIndustryListCreateView,
    CompanyIndustryRestoreDefaultsView,
    CurrencyDetailView,
    CurrencyListCreateView,
    CurrencyRestoreDefaultsView,
    PipelineStatusTemplateDetailView,
    PipelineStatusTemplateListCreateView,
    PipelineStatusTemplateRestoreDefaultsView,
)


urlpatterns = [
    path("company-industries/", CompanyIndustryListCreateView.as_view(), name="company-industries"),
    path("company-industries/restore-defaults/", CompanyIndustryRestoreDefaultsView.as_view(), name="company-industry-restore-defaults"),
    path("company-industries/<int:pk>/", CompanyIndustryDetailView.as_view(), name="company-industry-detail"),
    path("currencies/", CurrencyListCreateView.as_view(), name="currencies"),
    path("currencies/restore-defaults/", CurrencyRestoreDefaultsView.as_view(), name="currency-restore-defaults"),
    path("currencies/<int:pk>/", CurrencyDetailView.as_view(), name="currency-detail"),
    path("pipeline-status-templates/", PipelineStatusTemplateListCreateView.as_view(), name="pipeline-status-templates"),
    path("pipeline-status-templates/restore-defaults/", PipelineStatusTemplateRestoreDefaultsView.as_view(), name="pipeline-status-template-restore-defaults"),
    path("pipeline-status-templates/<int:pk>/", PipelineStatusTemplateDetailView.as_view(), name="pipeline-status-template-detail"),
]
