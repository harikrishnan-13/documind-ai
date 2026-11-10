from django.db.models import Count

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from apps.conversations.models import Conversation
from apps.conversations.serializers import (
    ConversationSerializer,
    ConversationDetailSerializer,
)


class ConversationListCreateView(generics.ListCreateAPIView):
    """
    GET: List conversations belonging to the authenticated user.

    POST: Create a new conversation.
    """

    permission_classes = [IsAuthenticated]

    serializer_class = ConversationSerializer

    def get_queryset(self):
        return (
            Conversation.objects
            .filter(
                user=self.request.user,
                is_archived=False,
            )
            .annotate(
                message_count=Count("messages")
            )
            .order_by("-updated_at")
        )


class ConversationDetailView(generics.RetrieveDestroyAPIView):
    """
    GET: Retrieve one conversation and its messages.

    DELETE: Delete a conversation and its messages.
    """

    permission_classes = [IsAuthenticated]

    serializer_class = ConversationDetailSerializer

    lookup_field = "id"

    def get_queryset(self):
        return (
            Conversation.objects
            .filter(user=self.request.user)
            .prefetch_related("messages")
        )
