from django.db import models
from django.utils import timezone


class Conversation(models.Model):
    company = models.ForeignKey("companies.Company", on_delete=models.CASCADE, related_name="conversations")
    name = models.CharField(max_length=255, blank=True)
    is_group = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_conversations",
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return self.name or f"Conversation {self.pk}"


class ConversationParticipant(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="conversation_participations")
    added_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="added_conversation_participants",
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(fields=["conversation", "user"], name="unique_conversation_participant"),
        ]

    def __str__(self):
        return f"{self.user} in {self.conversation}"


class ConversationMessage(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="sent_conversation_messages")
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"Message {self.pk} in {self.conversation_id}"
