from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView


def healthcheck(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", healthcheck, name="health"),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/companies/", include("apps.companies.urls")),
    path("api/crm-companies/", include("apps.crm.urls")),
    path("api/contacts/", include("apps.contacts.urls")),
    path("api/pipelines/", include("apps.pipelines.urls")),
    path("api/deals/", include("apps.deals.urls")),
    path("api/master-data/", include("apps.masterdata.urls")),
]
