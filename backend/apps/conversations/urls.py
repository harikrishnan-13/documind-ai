from django.urls import path

from apps.conversations.views import (
    ConversationListCreateView,
    ConversationDetailView,
    ConversationMessageCreateView,
)


urlpatterns = [
    # Create and list conversations.
    path(
        "",
        ConversationListCreateView.as_view(),
        name="conversation-list-create",
    ),

    # Retrieve and delete a conversation.
    path(
        "<uuid:id>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),

    # Send a message within a conversation.
    path(
        "<uuid:id>/messages/",
        ConversationMessageCreateView.as_view(),
        name="conversation-message-create",
    ),
]
