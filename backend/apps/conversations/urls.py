from django.urls import path

from apps.conversations.views import (
    ConversationListCreateView,
    ConversationDetailView,
    ConversationMessageCreateView,
    ConversationMessageRetryView,
)

from apps.conversations.management_views import (
    ArchivedConversationListView,
    ConversationArchiveView,
    ConversationRestoreView,
)


urlpatterns = [
    path(
        "",
        ConversationListCreateView.as_view(),
        name="conversation-list-create",
    ),

    path(
        "archived/",
        ArchivedConversationListView.as_view(),
        name="archived-conversation-list",
    ),

    path(
        "<uuid:id>/archive/",
        ConversationArchiveView.as_view(),
        name="conversation-archive",
    ),

    path(
        "<uuid:id>/restore/",
        ConversationRestoreView.as_view(),
        name="conversation-restore",
    ),

    path(
        "<uuid:id>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),

    path(
        "<uuid:id>/messages/",
        ConversationMessageCreateView.as_view(),
        name="conversation-message-create",
    ),

    path(
        "<uuid:id>/messages/<uuid:message_id>/retry/",
        ConversationMessageRetryView.as_view(),
        name="conversation-message-retry",
    ),
]
