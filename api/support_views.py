from datetime import datetime

from django.db.models import Count, OuterRef, Q, Subquery, Value, DateTimeField
from django.db.models.functions import Coalesce
from django.db.models import Prefetch
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import SupportConversation, SupportMessage
from .pagination import SupportConversationPagination
from .serializers import (
    SupportConversationCreateSerializer,
    SupportConversationDetailSerializer,
    SupportConversationListSerializer,
    SupportConversationStatusSerializer,
    SupportMessageCreateSerializer,
    is_admin_user,
)


class SupportConversationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
    pagination_class = SupportConversationPagination

    def get_queryset(self):
        message_queryset = SupportMessage.objects.select_related("sender").order_by("created_at")
        base_queryset = SupportConversation.objects.select_related("client").order_by("-last_message_at")

        if not is_admin_user(self.request.user):
            base_queryset = base_queryset.filter(client=self.request.user)

        action = getattr(self, "action", None)
        if action == "retrieve":
            return base_queryset.prefetch_related(Prefetch("messages", queryset=message_queryset))

        epoch = timezone.make_aware(datetime(1970, 1, 1))
        last_message_preview_subquery = (
            SupportMessage.objects.filter(conversation_id=OuterRef("pk"))
            .order_by("-created_at")
            .values("body")[:1]
        )

        if is_admin_user(self.request.user):
            unread_filter = (
                Q(messages__created_at__gt=Coalesce("admin_last_read_at", Value(epoch, output_field=DateTimeField())))
                & ~(Q(messages__sender__role="admin") | Q(messages__sender__is_staff=True))
            )
        else:
            unread_filter = (
                Q(messages__created_at__gt=Coalesce("client_last_read_at", Value(epoch, output_field=DateTimeField())))
                & (Q(messages__sender__role="admin") | Q(messages__sender__is_staff=True))
            )

        return base_queryset.annotate(
            message_count=Count("messages", distinct=True),
            unread_count=Count("messages", filter=unread_filter, distinct=True),
            last_message_preview=Coalesce(Subquery(last_message_preview_subquery), Value("")),
        )

    def get_serializer_class(self):
        if self.action == "create":
            return SupportConversationCreateSerializer
        if self.action == "send_message":
            return SupportMessageCreateSerializer
        if self.action == "update_status":
            return SupportConversationStatusSerializer
        if self.action == "retrieve":
            return SupportConversationDetailSerializer
        return SupportConversationListSerializer

    def _mark_as_read(self, conversation):
        now = timezone.now()
        if is_admin_user(self.request.user):
            conversation.admin_last_read_at = now
            conversation.save(update_fields=["admin_last_read_at"])
        else:
            conversation.client_last_read_at = now
            conversation.save(update_fields=["client_last_read_at"])

    def create(self, request, *args, **kwargs):
        if is_admin_user(request.user):
            return Response(
                {"detail": "Admins cannot start a support chat from this endpoint."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        subject = serializer.validated_data.get("subject", "").strip()
        message_body = serializer.validated_data["message"].strip()

        conversation = SupportConversation.objects.create(client=request.user)
        conversation.subject = subject or message_body[:80]
        conversation.status = SupportConversation.STATUS_OPEN

        message = SupportMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            body=message_body,
        )
        conversation.last_message_at = message.created_at
        conversation.client_last_read_at = message.created_at
        conversation.save()

        conversation = self.get_queryset().get(pk=conversation.pk)
        detail = SupportConversationDetailSerializer(conversation, context=self.get_serializer_context())
        return Response(detail.data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        conversation = self.get_object()
        self._mark_as_read(conversation)
        conversation = self.get_queryset().get(pk=conversation.pk)
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="messages")
    def send_message(self, request, pk=None):
        conversation = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        message = SupportMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            body=serializer.validated_data["body"].strip(),
        )

        conversation.last_message_at = message.created_at
        if not conversation.subject:
            conversation.subject = message.body[:80]

        if is_admin_user(request.user):
            conversation.admin_last_read_at = message.created_at
        else:
            conversation.client_last_read_at = message.created_at
            conversation.status = SupportConversation.STATUS_OPEN

        conversation.save()
        conversation = self.get_queryset().get(pk=conversation.pk)
        detail = SupportConversationDetailSerializer(conversation, context=self.get_serializer_context())
        return Response(detail.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only admins can update support chat status."},
                status=status.HTTP_403_FORBIDDEN,
            )

        conversation = self.get_object()
        serializer = self.get_serializer(conversation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        conversation = self.get_queryset().get(pk=conversation.pk)
        detail = SupportConversationDetailSerializer(conversation, context=self.get_serializer_context())
        return Response(detail.data)
