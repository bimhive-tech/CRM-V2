from django.urls import path

from apps.crm.views import CRMCompanyDetailView, CRMCompanyListCreateView


urlpatterns = [
    path("", CRMCompanyListCreateView.as_view(), name="crm-companies"),
    path("<int:pk>/", CRMCompanyDetailView.as_view(), name="crm-company-detail"),
]
