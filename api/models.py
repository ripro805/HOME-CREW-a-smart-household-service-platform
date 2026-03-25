from django.conf import settings
from django.db import models
from django.utils import timezone


class SupportConversation(models.Model):
    STATUS_OPEN = "open"
    STATUS_RESOLVED = "resolved"
    STATUS_CHOICES = (
        (STATUS_OPEN, "Open"),
        (STATUS_RESOLVED, "Resolved"),
    )

    client = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_conversation",
    )
    subject = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_OPEN)
    last_message_at = models.DateTimeField(default=timezone.now, db_index=True)
    client_last_read_at = models.DateTimeField(blank=True, null=True)
    admin_last_read_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-last_message_at"]

    def __str__(self):
        return f"Support chat for {self.client.email}"


class SupportMessage(models.Model):
    conversation = models.ForeignKey(
        SupportConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="support_messages",
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Message #{self.pk} in conversation #{self.conversation_id}"
