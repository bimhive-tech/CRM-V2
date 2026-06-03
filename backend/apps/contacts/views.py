import json

from django.db.models import Q
from django.http import HttpResponse
from django.utils.dateparse import parse_date
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from openpyxl import Workbook

from apps.auditlog.models import AuditLogEntry
from apps.auditlog.services import log_audit_event
from apps.accounts.permissions import HasAppPermission
from apps.crm.models import CRMCompany, CRMContact, CRMContactCompanyLink
from apps.contacts.importer import import_contact_records, parse_workbook
from apps.contacts.serializers import ContactSerializer
from apps.pipelines.access import (
    accessible_pipelines_queryset,
    pipelines_with_contact_visibility_queryset,
    pipelines_with_deal_visibility_queryset,
    user_can_manage_pipeline_contacts,
    user_can_move_pipeline_contacts,
    user_can_view_pipeline_contacts,
)
from apps.pipelines.models import Pipeline
from config.pagination import StandardResultsSetPagination


def contacts_queryset_for_user(user):
    company_ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in company_ids:
        company_ids.append(user.company_id)
    return CRMContactCompanyLink.objects.select_related("contact", "company", "owner", "pipeline").filter(tenant_company_id__in=company_ids)


def resolve_default_tenant_company(user):
    if user.company_id:
        return user.company
    first_company = user.companies.order_by("name", "id").first()
    if first_company:
        return first_company
    raise ValidationError({"detail": "This user is not assigned to a company."})


def parse_export_list_param(raw_value):
    return [item.strip() for item in str(raw_value or "").split(",") if item.strip()]


def parse_export_boolean(raw_value):
    return str(raw_value or "").strip().lower() in {"1", "true", "yes", "on"}


def apply_export_date_filter(queryset, *, field_lookup, operator, date_from_value, date_to_value):
    if not operator:
        return queryset

    supported_operators = {"before", "after", "between"}
    if operator not in supported_operators:
        raise ValidationError({"detail": "The selected export date filter is invalid."})

    date_from = parse_date(date_from_value) if date_from_value else None
    date_to = parse_date(date_to_value) if date_to_value else None

    if operator in {"before", "after"} and not date_from:
        raise ValidationError({"detail": "Please choose a comparison date for the export filter."})

    if operator == "between" and (not date_from or not date_to):
        raise ValidationError({"detail": "Please choose both start and end dates for the export filter."})

    if operator == "before":
        return queryset.filter(**{f"{field_lookup}__lt": date_from})

    if operator == "after":
        return queryset.filter(**{f"{field_lookup}__gt": date_from})

    if date_from > date_to:
        raise ValidationError({"detail": "The export start date must be before the end date."})
    return queryset.filter(**{f"{field_lookup}__range": (date_from, date_to)})


def build_excel_response(workbook, *, filename):
    response = HttpResponse(
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    workbook.save(response)
    return response


class ContactListCreateView(generics.ListCreateAPIView):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = contacts_queryset_for_user(self.request.user)
        query_params = self.request.query_params
        has_global_view = self.request.user.has_app_permission("contacts.view")
        visible_contact_pipelines = pipelines_with_contact_visibility_queryset(self.request.user)
        visible_deal_pipelines = pipelines_with_deal_visibility_queryset(self.request.user)

        search = query_params.get("search", "").strip()
        status = query_params.get("status", "").strip()
        owner_id = query_params.get("owner_id", "").strip()
        company_id = query_params.get("company_id", "").strip()
        pipeline_id = query_params.get("pipeline_id", "").strip()

        if search:
            queryset = queryset.filter(
                Q(contact__full_name__icontains=search)
                | Q(contact__email__icontains=search)
                | Q(contact__phone__icontains=search)
                | Q(title__icontains=search)
                | Q(company__name__icontains=search)
            )

        if status:
            queryset = queryset.filter(status=status)

        if owner_id:
            queryset = queryset.filter(owner_id=owner_id)

        if company_id:
            queryset = queryset.filter(company_id=company_id)

        if pipeline_id:
            pipeline = generics.get_object_or_404(accessible_pipelines_queryset(self.request.user), pk=pipeline_id)
            if not has_global_view and not user_can_view_pipeline_contacts(self.request.user, pipeline):
                raise ValidationError({"detail": "You do not have permission to view contacts in this pipeline."})
            queryset = queryset.filter(pipeline_id=pipeline_id)
        elif not has_global_view and not (self.request.user.is_platform_admin or self.request.user.is_company_admin):
            queryset = queryset.filter(
                Q(pipeline__in=visible_contact_pipelines)
                | Q(deals__pipeline__in=visible_deal_pipelines)
            ).distinct()

        return queryset

    def perform_create(self, serializer):
        pipeline = serializer.validated_data.get("pipeline")
        if not self.request.user.has_app_permission("contacts.create"):
            if pipeline is None or not user_can_manage_pipeline_contacts(self.request.user, pipeline):
                raise ValidationError({"detail": "You do not have permission to create contacts here."})
        company = serializer.validated_data["company"]
        contact_link = serializer.save(tenant_company=company.tenant_company, owner=self.request.user, contact={"last_touch": timezone.localdate(), **serializer.validated_data.get("contact", {})})
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_CONTACT,
            action=AuditLogEntry.ACTION_CREATE,
            title="Created contact",
            description=contact_link.contact.full_name,
            target=contact_link,
            company=contact_link.tenant_company,
            metadata={"company_name": contact_link.company.name},
        )


class ContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = contacts_queryset_for_user(self.request.user)
        if self.request.user.is_platform_admin or self.request.user.is_company_admin or self.request.user.has_app_permission("contacts.view"):
            return queryset
        visible_contact_pipelines = pipelines_with_contact_visibility_queryset(self.request.user)
        visible_deal_pipelines = pipelines_with_deal_visibility_queryset(self.request.user)
        return queryset.filter(
            Q(pipeline__in=visible_contact_pipelines)
            | Q(deals__pipeline__in=visible_deal_pipelines)
        ).distinct()

    def perform_update(self, serializer):
        instance = self.get_object()
        target_pipeline = serializer.validated_data.get("pipeline", instance.pipeline)
        if not self.request.user.has_app_permission("contacts.update"):
            update_fields = set(self.request.data.keys())
            status_only_fields = {"status", "pipeline_id"}
            if update_fields and update_fields.issubset(status_only_fields):
                if target_pipeline is None or not user_can_move_pipeline_contacts(self.request.user, target_pipeline):
                    raise ValidationError({"detail": "You do not have permission to move contacts in this pipeline."})
            elif target_pipeline is None or not user_can_manage_pipeline_contacts(self.request.user, target_pipeline):
                raise ValidationError({"detail": "You do not have permission to update this contact."})
        updated = serializer.save(contact={"last_touch": timezone.localdate(), **serializer.validated_data.get("contact", {})})
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_CONTACT,
            action=AuditLogEntry.ACTION_UPDATE,
            title="Updated contact",
            description=updated.contact.full_name,
            target=updated,
            company=updated.tenant_company,
            metadata={"company_name": updated.company.name},
        )

    def perform_destroy(self, instance):
        if not self.request.user.has_app_permission("contacts.delete"):
            if instance.pipeline is None or not user_can_manage_pipeline_contacts(self.request.user, instance.pipeline):
                raise ValidationError({"detail": "You do not have permission to delete this contact."})
        contact = instance.contact
        company = instance.tenant_company
        contact_name = contact.full_name
        instance.delete()
        if not contact.company_links.exists():
            contact.delete()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_CONTACT,
            action=AuditLogEntry.ACTION_DELETE,
            title="Deleted contact",
            description=contact_name,
            target=instance,
            company=company,
        )


class ContactImportPreviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]
    permission_required = "contacts.import_execute"
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if upload is None:
            raise ValidationError({"detail": "Please choose an Excel file to import."})
        if not upload.name.lower().endswith((".xlsx", ".xlsm")):
            raise ValidationError({"detail": "Only .xlsx files are supported right now."})

        try:
            preview = parse_workbook(upload)
        except Exception as error:
            raise ValidationError({"detail": f"Unable to read this Excel file. {error}"})

        return Response(preview)


class ContactImportExecuteView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        mapping_payload = request.data.get("mapping", "{}")
        pipeline_id = (request.data.get("pipeline_id") or "").strip()
        if upload is None:
            raise ValidationError({"detail": "Please choose an Excel file to import."})
        if not upload.name.lower().endswith((".xlsx", ".xlsm")):
            raise ValidationError({"detail": "Only .xlsx files are supported right now."})

        try:
            explicit_mapping = json.loads(mapping_payload) if mapping_payload else {}
        except json.JSONDecodeError:
            raise ValidationError({"detail": "The column mapping payload is invalid."})

        try:
            parsed = parse_workbook(upload, explicit_mapping=explicit_mapping)
        except Exception as error:
            raise ValidationError({"detail": f"Unable to parse this Excel file. {error}"})

        tenant_company = resolve_default_tenant_company(request.user)
        selected_pipeline = None
        if pipeline_id:
            selected_pipeline = generics.get_object_or_404(accessible_pipelines_queryset(request.user), pk=pipeline_id, company=tenant_company)
        if not request.user.has_app_permission("contacts.import_execute"):
            if selected_pipeline is None or not user_can_manage_pipeline_contacts(request.user, selected_pipeline):
                raise ValidationError({"detail": "You do not have permission to import contacts into this pipeline."})
        result = import_contact_records(parsed["records"], tenant_company, pipeline=selected_pipeline, imported_by=request.user)
        log_audit_event(
            request.user,
            event_type=AuditLogEntry.TYPE_IMPORT,
            action=AuditLogEntry.ACTION_IMPORT,
            title="Imported contacts",
            description=f"{result['created_contacts']} contacts, {result['created_companies']} companies.",
            target=selected_pipeline,
            company=tenant_company,
            metadata={
                "pipeline_name": selected_pipeline.name if selected_pipeline else "",
                "created_contacts": result["created_contacts"],
                "created_companies": result["created_companies"],
                "created_links": result["created_links"],
                "updated_links": result["updated_links"],
            },
        )
        return Response(
            {
                "stats": parsed["stats"],
                "result": result,
            }
        )


class ContactImportDeleteImportedView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAppPermission]
    permission_required = "contacts.delete_imported"

    def post(self, request):
        tenant_company = resolve_default_tenant_company(request.user)

        imported_links = CRMContactCompanyLink.objects.filter(
            tenant_company=tenant_company,
            created_by_import=True,
            imported_by=request.user,
        )
        deleted_link_count = imported_links.count()
        imported_contact_ids = list(imported_links.values_list("contact_id", flat=True).distinct())
        imported_company_ids = list(imported_links.values_list("company_id", flat=True).distinct())
        imported_links.delete()

        imported_contacts = CRMContact.objects.filter(
            tenant_company=tenant_company,
            created_by_import=True,
            imported_by=request.user,
            id__in=imported_contact_ids,
            company_links__isnull=True,
        ).distinct()
        deleted_contact_count = imported_contacts.count()
        imported_contacts.delete()

        imported_companies = CRMCompany.objects.filter(
            tenant_company=tenant_company,
            created_by_import=True,
            imported_by=request.user,
            id__in=imported_company_ids,
            contact_links__isnull=True,
        ).distinct()
        deleted_company_count = imported_companies.count()
        imported_companies.delete()

        return Response(
            {
                "deleted_links": deleted_link_count,
                "deleted_contacts": deleted_contact_count,
                "deleted_companies": deleted_company_count,
            }
        )


class ContactExportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = contacts_queryset_for_user(request.user).select_related("contact", "company", "owner", "pipeline")
        export_all = parse_export_boolean(request.query_params.get("export_all", "true"))

        if not export_all:
            pipeline_ids = [int(value) for value in parse_export_list_param(request.query_params.get("pipeline_ids")) if value.isdigit()]
            stage_keys = parse_export_list_param(request.query_params.get("stage_keys"))
            date_field = (request.query_params.get("date_field") or "").strip()
            date_operator = (request.query_params.get("date_operator") or "").strip()
            date_from_value = (request.query_params.get("date_from") or "").strip()
            date_to_value = (request.query_params.get("date_to") or "").strip()

            if pipeline_ids:
                visible_pipeline_ids = set(accessible_pipelines_queryset(request.user).filter(id__in=pipeline_ids).values_list("id", flat=True))
                if visible_pipeline_ids:
                    queryset = queryset.filter(pipeline_id__in=visible_pipeline_ids)
                else:
                    queryset = queryset.none()

            if stage_keys:
                stage_filters = Q()
                for stage_key in stage_keys:
                    pipeline_id, _, status_name = stage_key.partition(":")
                    if pipeline_id.isdigit() and status_name:
                        stage_filters |= Q(pipeline_id=int(pipeline_id), status=status_name)
                queryset = queryset.filter(stage_filters) if stage_filters else queryset.none()

            if date_field:
                allowed_date_fields = {
                    "created_at": "contact__created_at__date",
                    "last_touch": "contact__last_touch",
                    "stage_entered_at": "stage_entered_at__date",
                }
                field_lookup = allowed_date_fields.get(date_field)
                if not field_lookup:
                    raise ValidationError({"detail": "The selected export date field is invalid."})
                queryset = apply_export_date_filter(
                    queryset,
                    field_lookup=field_lookup,
                    operator=date_operator,
                    date_from_value=date_from_value,
                    date_to_value=date_to_value,
                )

        workbook = Workbook()
        sheet = workbook.active
        sheet.title = "Contacts"
        sheet.append(
            [
                "Full name",
                "Job title",
                "Email",
                "Phone numbers",
                "Company",
                "Pipeline",
                "Stage",
                "Owner",
                "Last touched",
                "Created date",
                "Stage entered",
                "Notes",
            ]
        )

        for contact_link in queryset.order_by("contact__full_name", "contact__email", "id"):
            contact = contact_link.contact
            sheet.append(
                [
                    contact.full_name,
                    contact.title,
                    contact.email,
                    " | ".join(contact.phone_numbers or ([contact.phone] if contact.phone else [])),
                    contact_link.company.name if contact_link.company_id else "",
                    contact_link.pipeline.name if contact_link.pipeline_id else "",
                    contact_link.status,
                    contact_link.owner.full_name if contact_link.owner_id else "",
                    contact.last_touch.isoformat() if contact.last_touch else "",
                    timezone.localtime(contact.created_at).date().isoformat() if contact.created_at else "",
                    timezone.localtime(contact_link.stage_entered_at).date().isoformat() if contact_link.stage_entered_at else "",
                    contact.notes,
                ]
            )

        return build_excel_response(workbook, filename="contacts-export.xlsx")
