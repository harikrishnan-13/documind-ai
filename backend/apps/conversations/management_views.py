from django.db.models import Count
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from drf_spectacular.utils import extend_schema

from apps.conversations.models import Conversation
from apps.conversations.serializers import ConversationSerializer


class ArchivedConversationListView(ListAPIView):
    """List archived conversations owned by the authenticated user."""

    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Conversation.objects
            .filter(user=self.request.user, is_archived=True)
            .annotate(message_count=Count("messages"))
            .order_by("-updated_at")
        )


class ConversationArchiveView(APIView):
    """Archive a conversation without deleting its messages."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: ConversationSerializer},
        summary="Archive a conversation",
    )
    def post(self, request, id):
        conversation = get_object_or_404(
            Conversation,
            id=id,
            user=request.user,
            is_archived=False,
        )

        conversation.is_archived = True
        conversation.save(update_fields=["is_archived", "updated_at"])

        conversation = (
            Conversation.objects
            .filter(id=conversation.id, user=request.user)
            .annotate(message_count=Count("messages"))
            .get()
        )

        return Response(
            {
                "status": "success",
                "message": "Conversation archived successfully.",
                "data": ConversationSerializer(conversation).data,
            },
            status=status.HTTP_200_OK,
        )


class ConversationRestoreView(APIView):
    """Restore an archived conversation."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: ConversationSerializer},
        summary="Restore a conversation",
    )
    def post(self, request, id):
        conversation = get_object_or_404(
            Conversation,
            id=id,
            user=request.user,
            is_archived=True,
        )

        conversation.is_archived = False
        conversation.save(update_fields=["is_archived", "updated_at"])

        conversation = (
            Conversation.objects
            .filter(id=conversation.id, user=request.user)
            .annotate(message_count=Count("messages"))
            .get()
        )

        return Response(
            {
                "status": "success",
                "message": "Conversation restored successfully.",
                "data": ConversationSerializer(conversation).data,
            },
            status=status.HTTP_200_OK,
        )
