from rest_framework import serializers

from apps.auditlog.models import AuditLogEntry


class AuditLogEntrySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_initials = serializers.SerializerMethodField()
    event_type_label = serializers.SerializerMethodField()
    action_label = serializers.SerializerMethodField()

    def get_actor_name(self, obj):
        if obj.actor and obj.actor.full_name:
            return obj.actor.full_name
        return "System"

    def get_actor_initials(self, obj):
        actor_name = self.get_actor_name(obj)
        return "".join(part[:1].upper() for part in actor_name.split()[:2] if part) or "SY"

    def get_event_type_label(self, obj):
        return obj.get_event_type_display()

    def get_action_label(self, obj):
        return obj.get_action_display()

    class Meta:
        model = AuditLogEntry
        fields = [
            "id",
            "event_type",
            "event_type_label",
            "action",
            "action_label",
            "title",
            "description",
            "target_type",
            "target_id",
            "target_label",
            "metadata",
            "actor_name",
            "actor_initials",
            "created_at",
        ]


class AuditLogCreateSerializer(serializers.Serializer):
    event_type = serializers.ChoiceField(
        choices=[
            AuditLogEntry.TYPE_NOTE,
            AuditLogEntry.TYPE_AUTH,
            AuditLogEntry.TYPE_CONTACT,
            AuditLogEntry.TYPE_DEAL,
            AuditLogEntry.TYPE_PIPELINE,
            AuditLogEntry.TYPE_TEAM,
        ],
        default=AuditLogEntry.TYPE_NOTE,
    )
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(allow_blank=True, required=False)

