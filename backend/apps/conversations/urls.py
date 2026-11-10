from django.urls import path

from apps.conversations.views import (
    ConversationListCreateView,
    ConversationDetailView,
    ConversationMessageCreateView,
)

from apps.conversations.management_views import (
    ArchivedConversationListView,
    ConversationArchiveView,
    ConversationRestoreView,
)


urlpatterns = [
    # Active conversations
    path(
        "",
        ConversationListCreateView.as_view(),
        name="conversation-list-create"
    ),

    # Archived conversations
    path(
        "archived/",
        ArchivedConversationListView.as_view(),
        name="archived-conversation-list"
    ),

    # Archive and restore
    path(
        "<uuid:id>/archive/",
        ConversationArchiveView.as_view(),
        name="conversation-archive"
    ),
    path(
        "<uuid:id>/restore/",
        ConversationRestoreView.as_view(),
        name="conversation-restore"
    ),

    # Conversation details and deletion
    path(
        "<uuid:id>/",
        ConversationDetailView.as_view(),
        name="conversation-detail"
    ),

    # Send a message
    path(
        "<uuid:id>/messages/",
        ConversationMessageCreateView.as_view(),
        name="conversation-message-create"
    ),
]
