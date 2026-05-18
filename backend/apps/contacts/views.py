from django.db.models import Q
from rest_framework import generics, permissions

from apps.crm.models import CRMContact
from apps.contacts.serializers import ContactSerializer
from config.pagination import StandardResultsSetPagination


def contacts_queryset_for_user(user):
    company_ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in company_ids:
        company_ids.append(user.company_id)
    return CRMContact.objects.select_related("company", "owner").filter(tenant_company_id__in=company_ids)


class ContactListCreateView(generics.ListCreateAPIView):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = contacts_queryset_for_user(self.request.user)
        query_params = self.request.query_params

        search = query_params.get("search", "").strip()
        status = query_params.get("status", "").strip()
        owner_id = query_params.get("owner_id", "").strip()
        company_id = query_params.get("company_id", "").strip()

        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
                | Q(title__icontains=search)
                | Q(company__name__icontains=search)
            )

        if status:
            queryset = queryset.filter(status=status)

        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)

        if company_id:
            queryset = queryset.filter(company_id=company_id)

        return queryset

    def perform_create(self, serializer):
        company = serializer.validated_data["company"]
        serializer.save(tenant_company=company.tenant_company)


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return contacts_queryset_for_user(self.request.user)
