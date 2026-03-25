from django.contrib import admin

from .models import SupportConversation, SupportMessage


@admin.register(SupportConversation)
class SupportConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "client", "status", "last_message_at", "updated_at")
    search_fields = ("client__email", "client__first_name", "client__last_name", "subject")
    list_filter = ("status", "last_message_at")
    ordering = ("-last_message_at",)


@admin.register(SupportMessage)
class SupportMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "sender", "created_at")
    search_fields = ("conversation__client__email", "sender__email", "body")
    ordering = ("-created_at",)
