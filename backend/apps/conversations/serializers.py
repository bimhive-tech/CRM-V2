from rest_framework import serializers

from apps.accounts.models import User
from apps.conversations.models import Conversation, ConversationMessage, ConversationParticipant


class ConversationUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email"]


class ConversationMessageSerializer(serializers.ModelSerializer):
    sender = ConversationUserSerializer(read_only=True)

    class Meta:
        model = ConversationMessage
        fields = ["id", "sender", "body", "created_at"]
        read_only_fields = ["id", "sender", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()
    participant_ids = serializers.PrimaryKeyRelatedField(
        source="participant_users",
        queryset=User.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    latest_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id",
            "name",
            "is_group",
            "participants",
            "participant_ids",
            "latest_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "participants", "latest_message", "created_at", "updated_at"]

    def get_participants(self, obj):
        users = [participant.user for participant in obj.participants.select_related("user").all()]
        return ConversationUserSerializer(users, many=True).data

    def get_latest_message(self, obj):
        latest = obj.messages.select_related("sender").order_by("-created_at", "-id").first()
        return ConversationMessageSerializer(latest).data if latest else None


class ConversationCreateUpdateSerializer(serializers.ModelSerializer):
    participant_ids = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True, write_only=True)

    class Meta:
        model = Conversation
        fields = ["id", "name", "is_group", "participant_ids"]
        read_only_fields = ["id"]


class ConversationOptionsSerializer(serializers.Serializer):
    users = ConversationUserSerializer(many=True)
