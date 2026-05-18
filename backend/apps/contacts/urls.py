from django.urls import path

from apps.contacts.views import ContactDetailView, ContactListCreateView


urlpatterns = [
    path("", ContactListCreateView.as_view(), name="contacts"),
    path("<int:pk>/", ContactDetailView.as_view(), name="contact-detail"),
]
