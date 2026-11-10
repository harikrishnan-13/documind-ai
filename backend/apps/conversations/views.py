import logging

from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404

from openai import OpenAIError

from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_engine.services.openai_service import OpenAIService

from apps.conversations.models import (
    Conversation,
    ConversationMessage,
)

from apps.conversations.serializers import (
    ConversationSerializer,
    ConversationDetailSerializer,
    ConversationMessageCreateSerializer,
    ConversationMessageSerializer,
)

logger = logging.getLogger(__name__)


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


class ConversationMessageCreateView(APIView):
    """
    POST: Send a message within an existing conversation.
    Uses OpenAI previous_response_id to maintain context.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ConversationMessageCreateSerializer,
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
            401: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
            502: OpenApiTypes.OBJECT,
            503: OpenApiTypes.OBJECT,
        },
        summary="Send a message in a conversation",
        description=(
            "Sends a message to OpenAI using the previous "
            "response ID when available. Saves user and "
            "assistant messages and returns token usage."
        ),
    )
    def post(self, request, id):

        # 1. Validate incoming message.
        request_serializer = ConversationMessageCreateSerializer(
            data=request.data
        )

        request_serializer.is_valid(
            raise_exception=True
        )

        message_text = request_serializer.validated_data[
            "message"
        ]

        # 2. Verify conversation ownership.
        conversation = get_object_or_404(
            Conversation.objects.filter(
                user=request.user,
                is_archived=False,
            ),
            id=id,
        )

        # 3. Initialize OpenAI service before saving the message.
        try:
            openai_service = OpenAIService()

        except ValueError:
            logger.exception(
                "OpenAI service configuration error."
            )

            return Response(
                {
                    "status": "error",
                    "message": (
                        "AI service is not configured correctly."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # 4. Retrieve the previous response ID.
        previous_response_id = (
            conversation.last_response_id or None
        )

        # 5. Save the user's message.
        user_message = ConversationMessage.objects.create(
            conversation=conversation,
            role=ConversationMessage.Role.USER,
            content=message_text,
        )

        # 6. Send the message to OpenAI.
        try:
            ai_result = (
                openai_service.generate_conversation_response(
                    message=message_text,
                    previous_response_id=previous_response_id,
                )
            )

        except OpenAIError:
            logger.exception(
                "OpenAI failed to generate conversation response."
            )

            user_message.delete()

            return Response(
                {
                    "status": "error",
                    "message": (
                        "AI service is temporarily unavailable. "
                        "Please try again."
                    ),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except ValueError:
            logger.exception(
                "AI response generation returned an invalid result."
            )

            user_message.delete()

            return Response(
                {
                    "status": "error",
                    "message": (
                        "AI could not generate a valid response."
                    ),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # 7. Extract response and token usage.
        answer = ai_result["answer"]
        response_id = ai_result["response_id"]
        usage = ai_result.get("usage") or {}

        input_tokens = usage.get("input_tokens")
        output_tokens = usage.get("output_tokens")
        total_tokens = usage.get("total_tokens")

        # 8. Save assistant response and update conversation.
        try:
            with transaction.atomic():

                assistant_message = (
                    ConversationMessage.objects.create(
                        conversation=conversation,
                        role=ConversationMessage.Role.ASSISTANT,
                        content=answer,
                        openai_response_id=response_id,
                        input_tokens=input_tokens,
                        output_tokens=output_tokens,
                        total_tokens=total_tokens,
                    )
                )

                conversation.last_response_id = response_id

                conversation.save(
                    update_fields=[
                        "last_response_id",
                        "updated_at",
                    ]
                )

        except Exception:
            logger.exception(
                "Failed to persist assistant response."
            )

            return Response(
                {
                    "status": "error",
                    "message": (
                        "The AI response was generated, but "
                        "could not be saved. Please contact support "
                        "before retrying this message."
                    ),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 9. Serialize saved messages.
        user_message_data = ConversationMessageSerializer(
            user_message
        ).data

        assistant_message_data = ConversationMessageSerializer(
            assistant_message
        ).data

        # 10. Return completed conversation turn.
        return Response(
            {
                "status": "success",
                "message": "AI response generated successfully.",
                "data": {
                    "conversation_id": str(conversation.id),
                    "user_message": user_message_data,
                    "assistant_message": assistant_message_data,
                    "answer": answer,
                    "response_id": response_id,
                    "usage": usage,
                },
            },
            status=status.HTTP_200_OK,
        )
