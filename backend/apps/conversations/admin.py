from django.contrib import admin

from apps.conversations.models import (
    Conversation,
    ConversationMessage,
)


class ConversationMessageInline(admin.TabularInline):
    model = ConversationMessage
    extra = 0
    can_delete = False

    readonly_fields = (
        "id",
        "role",
        "content",
        "openai_response_id",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "created_at",
    )

    fields = readonly_fields


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "title",
        "user",
        "is_archived",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "is_archived",
        "created_at",
    )

    search_fields = (
        "title",
        "user__email",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
        "last_response_id",
    )

    inlines = [
        ConversationMessageInline,
    ]

    list_select_related = (
        "user",
    )


@admin.register(ConversationMessage)
class ConversationMessageAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "conversation",
        "role",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "created_at",
    )

    list_filter = (
        "role",
        "created_at",
    )

    search_fields = (
        "content",
        "conversation__title",
        "conversation__user__email",
    )

    readonly_fields = (
        "id",
        "conversation",
        "role",
        "content",
        "openai_response_id",
        "input_tokens",
        "output_tokens",
        "total_tokens",
        "created_at",
    )

    list_select_related = (
        "conversation",
        "conversation__user",
    )
