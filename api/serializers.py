from rest_framework import serializers

from .models import SupportConversation, SupportMessage, AssistantChatSession, AssistantChatMessage


def is_admin_user(user):
    return getattr(user, "role", None) == "admin" or getattr(user, "is_staff", False)


class ContactMessageSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100, trim_whitespace=True)
    last_name = serializers.CharField(max_length=100, trim_whitespace=True)
    phone = serializers.CharField(max_length=30, trim_whitespace=True)
    email = serializers.EmailField()
    message = serializers.CharField(max_length=2000, trim_whitespace=True)

    def validate_phone(self, value):
        digits = ''.join(ch for ch in value if ch.isdigit())
        if len(digits) < 8:
            raise serializers.ValidationError('Enter a valid phone number.')
        return value

    def validate_message(self, value):
        if len(value.strip()) < 12:
            raise serializers.ValidationError('Message should be at least 12 characters.')
        return value


class SupportMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    from_admin = serializers.SerializerMethodField()

    class Meta:
        model = SupportMessage
        fields = [
            "id",
            "body",
            "created_at",
            "sender_name",
            "sender_role",
            "from_admin",
        ]

    def get_sender_name(self, obj):
        full_name = obj.sender.get_full_name().strip()
        return full_name or obj.sender.email

    def get_sender_role(self, obj):
        return getattr(obj.sender, "role", "client")

    def get_from_admin(self, obj):
        return is_admin_user(obj.sender)


class SupportConversationBaseSerializer(serializers.ModelSerializer):
    client_name = serializers.SerializerMethodField()
    client_email = serializers.EmailField(source="client.email", read_only=True)
    unread_count = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = SupportConversation
        fields = [
            "id",
            "subject",
            "status",
            "created_at",
            "updated_at",
            "last_message_at",
            "client_name",
            "client_email",
            "unread_count",
            "last_message_preview",
            "message_count",
        ]

    def _messages(self, obj):
        return list(obj.messages.all())

    def get_client_name(self, obj):
        full_name = obj.client.get_full_name().strip()
        return full_name or obj.client.email

    def get_unread_count(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return 0

        read_at = obj.admin_last_read_at if is_admin_user(user) else obj.client_last_read_at
        unread_count = 0

        for message in self._messages(obj):
            from_admin = is_admin_user(message.sender)
            is_relevant = not from_admin if is_admin_user(user) else from_admin
            if is_relevant and (read_at is None or message.created_at > read_at):
                unread_count += 1

        return unread_count

    def get_last_message_preview(self, obj):
        messages = self._messages(obj)
        if not messages:
            return ""
        body = messages[-1].body.strip()
        return body if len(body) <= 88 else f"{body[:85]}..."

    def get_message_count(self, obj):
        return len(self._messages(obj))


class SupportConversationListSerializer(SupportConversationBaseSerializer):
    pass


class SupportConversationDetailSerializer(SupportConversationBaseSerializer):
    messages = SupportMessageSerializer(many=True, read_only=True)

    class Meta(SupportConversationBaseSerializer.Meta):
        fields = SupportConversationBaseSerializer.Meta.fields + ["messages"]


class SupportConversationCreateSerializer(serializers.Serializer):
    subject = serializers.CharField(max_length=160, required=False, allow_blank=True, trim_whitespace=True)
    message = serializers.CharField(max_length=2000, trim_whitespace=True)

    def validate_message(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Message should be at least 2 characters.")
        return value


class SupportMessageCreateSerializer(serializers.Serializer):
    body = serializers.CharField(max_length=2000, trim_whitespace=True)

    def validate_body(self, value):
        if len(value.strip()) < 1:
            raise serializers.ValidationError("Message cannot be empty.")
        return value


class SupportConversationStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportConversation
        fields = ["status"]


class ChatbotContextSerializer(serializers.Serializer):
    service_id = serializers.IntegerField(required=False, allow_null=True)
    booking_date = serializers.CharField(required=False, allow_blank=True, max_length=100)
    location = serializers.CharField(required=False, allow_blank=True, max_length=255)
    booking_name = serializers.CharField(required=False, allow_blank=True, max_length=120)
    booking_phone = serializers.CharField(required=False, allow_blank=True, max_length=30)
    confirm_booking = serializers.BooleanField(required=False, default=False)
    order_id = serializers.IntegerField(required=False, allow_null=True)
    awaiting_order_id = serializers.BooleanField(required=False, default=False)
    awaiting_update_order_id = serializers.BooleanField(required=False, default=False)
    awaiting_new_location = serializers.BooleanField(required=False, default=False)
    pending_rating = serializers.FloatField(required=False, allow_null=True)


class ChatbotRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000, trim_whitespace=True)
    session_id = serializers.IntegerField(required=False, allow_null=True)
    context = ChatbotContextSerializer(required=False)

    def validate_message(self, value):
        if len(value.strip()) < 1:
            raise serializers.ValidationError("Message cannot be empty.")
        return value


class AssistantChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssistantChatMessage
        fields = ["id", "role", "text", "data", "created_at"]


class AssistantChatSessionListSerializer(serializers.ModelSerializer):
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = AssistantChatSession
        fields = ["id", "title", "last_message_preview", "last_message_at", "created_at", "updated_at"]

    def get_last_message_preview(self, obj):
        text = getattr(obj, "last_message_text", None)
        if text is None:
            last_message = obj.messages.order_by("-created_at").values_list("text", flat=True).first()
            text = last_message or ""

        text = (text or "").strip()
        if not text:
            return ""
        return text if len(text) <= 88 else f"{text[:85]}..."


class AssistantChatSessionDetailSerializer(serializers.ModelSerializer):
    messages = serializers.SerializerMethodField()

    class Meta:
        model = AssistantChatSession
        fields = ["id", "title", "context", "last_message_at", "created_at", "updated_at", "messages"]

    def get_messages(self, obj):
        limit = self.context.get("messages_limit")
        queryset = obj.messages.order_by("-created_at")

        if isinstance(limit, int) and limit > 0:
            items = list(queryset[:limit])
        else:
            items = list(queryset)

        items.reverse()  # Oldest -> newest for UI continuity
        return AssistantChatMessageSerializer(items, many=True).data
