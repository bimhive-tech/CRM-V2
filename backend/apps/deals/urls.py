from django.urls import path

from apps.deals.views import DealDetailView, DealListCreateView


urlpatterns = [
    path("", DealListCreateView.as_view(), name="deals"),
    path("<int:pk>/", DealDetailView.as_view(), name="deal-detail"),
]

