from django.urls import path

from apps.accounts.views import CompanyDetailView, CompanyListCreateView


urlpatterns = [
    path("", CompanyListCreateView.as_view(), name="companies"),
    path("<int:pk>/", CompanyDetailView.as_view(), name="company-detail"),
]
