from django.db import transaction
from django.db.models import Q
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.auditlog.models import AuditLogEntry
from apps.auditlog.services import log_audit_event
from apps.conversations.models import Conversation, ConversationMessage, ConversationParticipant
from apps.conversations.serializers import (
    ConversationCreateUpdateSerializer,
    ConversationMessageSerializer,
    ConversationOptionsSerializer,
    ConversationSerializer,
)


def company_ids_for_user(user):
    ids = list(user.companies.values_list("id", flat=True))
    if user.company_id and user.company_id not in ids:
        ids.append(user.company_id)
    return ids


def resolve_default_company_for_user(user):
    company = user.company or user.companies.order_by("name", "id").first()
    if company:
        return company
    raise ValidationError({"detail": "This user is not assigned to a company."})


def company_users_queryset(company):
    return User.objects.filter(Q(company=company) | Q(companies=company)).distinct().order_by("full_name", "email")


def conversation_queryset_for_user(user):
    return (
        Conversation.objects.filter(company_id__in=company_ids_for_user(user), participants__user=user)
        .select_related("company", "created_by")
        .prefetch_related("participants__user", "messages__sender")
        .distinct()
    )


def ensure_manage_permission(user, action):
    permission_map = {
        "create": "conversations.create",
        "update": "conversations.update",
        "delete": "conversations.delete",
    }
    permission_code = permission_map[action]
    if user.is_platform_admin or user.has_app_permission(permission_code):
        return
    raise ValidationError({"detail": "You do not have permission to manage conversations."})


def sync_participants(conversation, users, actor):
    conversation.participants.exclude(user__in=users).delete()
    existing_ids = set(conversation.participants.values_list("user_id", flat=True))
    new_rows = [
        ConversationParticipant(conversation=conversation, user=user, added_by=actor)
        for user in users
        if user.id not in existing_ids
    ]
    if new_rows:
        ConversationParticipant.objects.bulk_create(new_rows)


class ConversationListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return conversation_queryset_for_user(self.request.user)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ConversationCreateUpdateSerializer
        return ConversationSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        ensure_manage_permission(self.request.user, "create")
        company = resolve_default_company_for_user(self.request.user)
        participants = list(serializer.validated_data["participant_users"])
        if self.request.user not in participants:
            participants.append(self.request.user)
        allowed_ids = set(company_users_queryset(company).values_list("id", flat=True))
        if any(user.id not in allowed_ids for user in participants):
            raise ValidationError({"participant_ids": "All participants must belong to the current company."})
        if not serializer.validated_data.get("is_group") and len(participants) != 2:
            raise ValidationError({"participant_ids": "One-on-one conversations must have exactly two participants."})
        conversation = serializer.save(company=company, created_by=self.request.user)
        sync_participants(conversation, participants, self.request.user)
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_TEAM,
            action=AuditLogEntry.ACTION_CREATE,
            title="Created conversation",
            description=conversation.name or "New conversation",
            target=conversation,
            company=company,
        )


class ConversationDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return conversation_queryset_for_user(self.request.user)

    def get_serializer_class(self):
        if self.request.method in {"PUT", "PATCH"}:
            return ConversationCreateUpdateSerializer
        return ConversationSerializer

    @transaction.atomic
    def perform_update(self, serializer):
        ensure_manage_permission(self.request.user, "update")
        conversation = self.get_object()
        participants = list(serializer.validated_data.get("participant_users", [])) or [item.user for item in conversation.participants.select_related("user").all()]
        if self.request.user not in participants:
            participants.append(self.request.user)
        allowed_ids = set(company_users_queryset(conversation.company).values_list("id", flat=True))
        if any(user.id not in allowed_ids for user in participants):
            raise ValidationError({"participant_ids": "All participants must belong to the current company."})
        if not serializer.validated_data.get("is_group", conversation.is_group) and len(participants) != 2:
            raise ValidationError({"participant_ids": "One-on-one conversations must have exactly two participants."})
        updated = serializer.save()
        sync_participants(updated, participants, self.request.user)
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_TEAM,
            action=AuditLogEntry.ACTION_UPDATE,
            title="Updated conversation",
            description=updated.name or "Conversation details",
            target=updated,
            company=updated.company,
        )

    def perform_destroy(self, instance):
        ensure_manage_permission(self.request.user, "delete")
        conversation_name = instance.name or "Conversation"
        company = instance.company
        instance.delete()
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_TEAM,
            action=AuditLogEntry.ACTION_DELETE,
            title="Deleted conversation",
            description=conversation_name,
            company=company,
        )


class ConversationMessageListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationMessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_conversation(self):
        return generics.get_object_or_404(conversation_queryset_for_user(self.request.user), pk=self.kwargs["conversation_pk"])

    def get_queryset(self):
        conversation = self.get_conversation()
        return conversation.messages.select_related("sender").all()

    def perform_create(self, serializer):
        conversation = self.get_conversation()
        body = (self.request.data.get("body") or "").strip()
        if not body:
            raise ValidationError({"body": "Message body is required."})
        message = serializer.save(conversation=conversation, sender=self.request.user, body=body)
        log_audit_event(
            self.request.user,
            event_type=AuditLogEntry.TYPE_TEAM,
            action=AuditLogEntry.ACTION_UPDATE,
            title="Sent conversation message",
            description=conversation.name or "Conversation",
            target=conversation,
            company=conversation.company,
            metadata={"message_id": message.id},
        )


class ConversationOptionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        company = resolve_default_company_for_user(request.user)
        users = company_users_queryset(company).distinct()
        return Response(ConversationOptionsSerializer({"users": users}).data)
