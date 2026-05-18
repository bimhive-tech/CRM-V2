from rest_framework import generics, permissions

from apps.crm.models import CRMContact
from apps.contacts.serializers import ContactSerializer


def contacts_queryset_for_user(user):
    company_ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in company_ids:
        company_ids.append(user.company_id)
    return CRMContact.objects.select_related("company", "owner").filter(tenant_company_id__in=company_ids)


class ContactListCreateView(generics.ListCreateAPIView):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return contacts_queryset_for_user(self.request.user)

    def perform_create(self, serializer):
        company = serializer.validated_data["company"]
        serializer.save(tenant_company=company.tenant_company)


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return contacts_queryset_for_user(self.request.user)
