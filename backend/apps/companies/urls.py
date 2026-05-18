from django.urls import path

from apps.accounts.views import CompanyDetailView, CompanyListCreateView, CompanyLogoUploadView


urlpatterns = [
    path("", CompanyListCreateView.as_view(), name="companies"),
    path("<int:pk>/logo/", CompanyLogoUploadView.as_view(), name="company-logo-upload"),
    path("<int:pk>/", CompanyDetailView.as_view(), name="company-detail"),
]
