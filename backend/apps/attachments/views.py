from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.attachments.models import Attachment
from apps.attachments.serializers import AttachmentSerializer
from apps.auditlog.models import AuditLogEntry
from apps.auditlog.services import log_audit_event
from apps.contacts.views import contacts_queryset_for_user
from apps.crm.views import crm_companies_queryset_for_user
from apps.deals.views import deals_queryset_for_user
from apps.pipelines.access import (
    pipelines_with_contact_visibility_queryset,
    pipelines_with_deal_visibility_queryset,
    user_can_manage_pipeline_companies,
    user_can_manage_pipeline_contacts,
    user_can_manage_pipeline_deals,
)


def visible_contacts_queryset_for_user(user):
    queryset = contacts_queryset_for_user(user)
    if user.is_platform_admin or user.is_company_admin or user.has_app_permission("contacts.view"):
        return queryset
    visible_contact_pipelines = pipelines_with_contact_visibility_queryset(user)
    visible_deal_pipelines = pipelines_with_deal_visibility_queryset(user)
    return queryset.filter(
        Q(pipeline__in=visible_contact_pipelines) | Q(deals__pipeline__in=visible_deal_pipelines)
    ).distinct()


def visible_deals_queryset_for_user(user):
    queryset = deals_queryset_for_user(user)
    if user.is_platform_admin or user.is_company_admin or user.has_app_permission("deals.view"):
        return queryset
    visible_pipelines = pipelines_with_deal_visibility_queryset(user)
    return queryset.filter(pipeline__in=visible_pipelines).distinct()


def can_manage_contact_attachments(user, contact):
    if user.is_platform_admin or user.is_company_admin or user.has_app_permission("contacts.update"):
        return True
    return bool(contact.pipeline_id and user_can_manage_pipeline_contacts(user, contact.pipeline))


def can_manage_company_attachments(user, company):
    if user.is_platform_admin or user.is_company_admin or user.has_app_permission("crm_companies.update"):
        return True
    company_visible_pipelines = pipelines_with_contact_visibility_queryset(user)
    deal_visible_pipelines = pipelines_with_deal_visibility_queryset(user)
    for pipeline in list(company_visible_pipelines) + list(deal_visible_pipelines):
        if user_can_manage_pipeline_companies(user, pipeline) and (
            company.contact_links.filter(pipeline=pipeline).exists()
            or company.contacts.filter(pipeline=pipeline).exists()
            or company.deals.filter(pipeline=pipeline).exists()
        ):
            return True
    return False


def can_manage_deal_attachments(user, deal):
    if user.is_platform_admin or user.is_company_admin or user.has_app_permission("deals.update"):
        return True
    return bool(deal.pipeline_id and user_can_manage_pipeline_deals(user, deal.pipeline))


def resolve_target(user, target_type, target_id):
    if target_type == Attachment.TARGET_CONTACT:
        return get_object_or_404(visible_contacts_queryset_for_user(user), pk=target_id)
    if target_type == Attachment.TARGET_COMPANY:
        return get_object_or_404(crm_companies_queryset_for_user(user), pk=target_id)
    if target_type == Attachment.TARGET_DEAL:
        return get_object_or_404(visible_deals_queryset_for_user(user), pk=target_id)
    raise ValidationError({"detail": "Unknown attachment target."})


def ensure_can_manage_target(user, target_type, target):
    if target_type == Attachment.TARGET_CONTACT and can_manage_contact_attachments(user, target):
        return
    if target_type == Attachment.TARGET_COMPANY and can_manage_company_attachments(user, target):
        return
    if target_type == Attachment.TARGET_DEAL and can_manage_deal_attachments(user, target):
        return
    raise ValidationError({"detail": "You do not have permission to manage attachments on this record."})


class AttachmentListCreateView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        target_type = (request.query_params.get("target_type") or "").strip()
        target_id = (request.query_params.get("target_id") or "").strip()
        if not target_type or not target_id:
            raise ValidationError({"detail": "Attachment target_type and target_id are required."})

        target = resolve_target(request.user, target_type, target_id)
        filters = {
            "target_type": target_type,
            f"{target_type}_id": target.id,
        }
        queryset = Attachment.objects.select_related("uploaded_by").filter(**filters)
        return Response(AttachmentSerializer(queryset, many=True).data)

    def post(self, request):
        target_type = (request.query_params.get("target_type") or request.data.get("target_type") or "").strip()
        target_id = (request.query_params.get("target_id") or request.data.get("target_id") or "").strip()
        upload = request.FILES.get("file")
        if not target_type or not target_id:
            raise ValidationError({"detail": "Attachment target_type and target_id are required."})
        if upload is None:
            raise ValidationError({"detail": "Please choose a file to upload."})

        target = resolve_target(request.user, target_type, target_id)
        ensure_can_manage_target(request.user, target_type, target)

        attachment = Attachment(
            target_type=target_type,
            uploaded_by=request.user,
            file=upload,
            original_name=upload.name,
            content_type=getattr(upload, "content_type", ""),
            file_size=getattr(upload, "size", 0) or 0,
        )
        if target_type == Attachment.TARGET_CONTACT:
            attachment.contact = target
        elif target_type == Attachment.TARGET_COMPANY:
            attachment.company = target
        else:
            attachment.deal = target
        attachment.save()
        log_audit_event(
            request.user,
            event_type=AuditLogEntry.TYPE_ATTACHMENT,
            action=AuditLogEntry.ACTION_CREATE,
            title="Uploaded attachment",
            description=attachment.original_name,
            target=target,
            metadata={"target_type": target_type, "file_size": attachment.file_size},
        )
        return Response(AttachmentSerializer(attachment).data, status=201)


class AttachmentDetailView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        attachment = get_object_or_404(Attachment.objects.select_related("uploaded_by", "contact__pipeline", "company", "deal__pipeline"), pk=self.kwargs["pk"])
        resolve_target(self.request.user, attachment.target_type, attachment.target_id)
        return attachment

    def delete(self, request, pk):
        attachment = self.get_object()
        target = resolve_target(request.user, attachment.target_type, attachment.target_id)
        ensure_can_manage_target(request.user, attachment.target_type, target)
        file_name = attachment.original_name
        attachment.file.delete(save=False)
        attachment.delete()
        log_audit_event(
            request.user,
            event_type=AuditLogEntry.TYPE_ATTACHMENT,
            action=AuditLogEntry.ACTION_DELETE,
            title="Deleted attachment",
            description=file_name,
            target=target,
            metadata={"target_type": attachment.target_type},
        )
        return Response(status=204)


class AttachmentDownloadView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        attachment = get_object_or_404(Attachment.objects.select_related("contact__pipeline", "company", "deal__pipeline"), pk=pk)
        resolve_target(request.user, attachment.target_type, attachment.target_id)
        return FileResponse(attachment.file.open("rb"), as_attachment=True, filename=attachment.original_name)
