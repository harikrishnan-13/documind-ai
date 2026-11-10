from django.urls import path

from apps.conversations.views import (
    ConversationListCreateView,
    ConversationDetailView,
)


urlpatterns = [
    path(
        "",
        ConversationListCreateView.as_view(),
        name="conversation-list-create",
    ),

    path(
        "<uuid:id>/",
        ConversationDetailView.as_view(),
        name="conversation-detail",
    ),
]
