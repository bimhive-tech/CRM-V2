from django.urls import path

from apps.crm.views import CRMCompanyDetailView, CRMCompanyExportView, CRMCompanyListCreateView


urlpatterns = [
    path("export/", CRMCompanyExportView.as_view(), name="crm-company-export"),
    path("", CRMCompanyListCreateView.as_view(), name="crm-companies"),
    path("<int:pk>/", CRMCompanyDetailView.as_view(), name="crm-company-detail"),
]
