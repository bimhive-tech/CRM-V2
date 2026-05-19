from django.urls import path

from apps.contacts.views import (
    ContactDetailView,
    ContactImportDeleteImportedView,
    ContactImportExecuteView,
    ContactImportPreviewView,
    ContactListCreateView,
)


urlpatterns = [
    path("import/delete-imported/", ContactImportDeleteImportedView.as_view(), name="contact-import-delete-imported"),
    path("import/preview/", ContactImportPreviewView.as_view(), name="contact-import-preview"),
    path("import/execute/", ContactImportExecuteView.as_view(), name="contact-import-execute"),
    path("", ContactListCreateView.as_view(), name="contacts"),
    path("<int:pk>/", ContactDetailView.as_view(), name="contact-detail"),
]
