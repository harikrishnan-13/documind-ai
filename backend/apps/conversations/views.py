import logging

from django.db import transaction
from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone

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


# ==========================================================
# HELPER FUNCTIONS
# ==========================================================

def mark_message_failed(user_message, error_message):
    """
    Preserve the original user message and mark it as failed.
    """

    ConversationMessage.objects.filter(
        id=user_message.id
    ).update(
        status=ConversationMessage.Status.FAILED,
        error_message=error_message,
        updated_at=timezone.now(),
    )

    user_message.status = ConversationMessage.Status.FAILED
    user_message.error_message = error_message


def generate_and_save_response(
    conversation,
    user_message,
    openai_service,
    previous_response_id=None,
):
    """
    Generate an AI response and persist the completed conversation turn.

    The original user message is never deleted when processing fails.
    """

    # ------------------------------------------------------
    # 1. Generate response using OpenAI
    # ------------------------------------------------------

    try:
        ai_result = openai_service.generate_conversation_response(
            message=user_message.content,
            previous_response_id=previous_response_id,
        )

        answer = ai_result.get("answer")
        response_id = ai_result.get("response_id")
        usage = ai_result.get("usage") or {}

        if not answer or not response_id:
            raise ValueError(
                "The AI service returned an incomplete response."
            )

    except OpenAIError:
        logger.exception(
            "OpenAI failed to generate conversation response."
        )

        error_message = (
            "AI service is temporarily unavailable. "
            "Please retry this message."
        )

        mark_message_failed(user_message, error_message)

        return Response(
            {
                "status": "error",
                "message": error_message,
                "data": {
                    "user_message": ConversationMessageSerializer(
                        user_message
                    ).data,
                    "retryable": True,
                },
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    except ValueError:
        logger.exception(
            "AI response generation returned an invalid result."
        )

        error_message = (
            "AI could not generate a valid response. "
            "Please retry this message."
        )

        mark_message_failed(user_message, error_message)

        return Response(
            {
                "status": "error",
                "message": error_message,
                "data": {
                    "user_message": ConversationMessageSerializer(
                        user_message
                    ).data,
                    "retryable": True,
                },
            },
            status=status.HTTP_502_BAD_GATEWAY,
        )

    except Exception:
        logger.exception(
            "Unexpected error during AI response generation."
        )

        error_message = (
            "An unexpected error occurred while processing "
            "your message. Please retry."
        )

        mark_message_failed(user_message, error_message)

        return Response(
            {
                "status": "error",
                "message": error_message,
                "data": {
                    "user_message": ConversationMessageSerializer(
                        user_message
                    ).data,
                    "retryable": True,
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ------------------------------------------------------
    # 2. Extract token usage
    # ------------------------------------------------------

    input_tokens = usage.get("input_tokens")
    output_tokens = usage.get("output_tokens")
    total_tokens = usage.get("total_tokens")

    # ------------------------------------------------------
    # 3. Save assistant response and complete user message
    # ------------------------------------------------------

    try:
        with transaction.atomic():

            assistant_message = ConversationMessage.objects.create(
                conversation=conversation,
                role=ConversationMessage.Role.ASSISTANT,
                content=answer,
                status=ConversationMessage.Status.COMPLETED,
                openai_response_id=response_id,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
            )

            user_message.status = (
                ConversationMessage.Status.COMPLETED
            )
            user_message.error_message = ""

            user_message.save(
                update_fields=[
                    "status",
                    "error_message",
                    "updated_at",
                ]
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
            "Failed to persist the generated assistant response."
        )

        error_message = (
            "The AI response was generated, but could not be "
            "saved. Please retry this message."
        )

        mark_message_failed(user_message, error_message)

        return Response(
            {
                "status": "error",
                "message": error_message,
                "data": {
                    "user_message": ConversationMessageSerializer(
                        user_message
                    ).data,
                    "retryable": True,
                },
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # ------------------------------------------------------
    # 4. Return completed conversation turn
    # ------------------------------------------------------

    user_message_data = ConversationMessageSerializer(
        user_message
    ).data

    assistant_message_data = ConversationMessageSerializer(
        assistant_message
    ).data

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


# ==========================================================
# CONVERSATION CRUD APIs
# ==========================================================

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


# ==========================================================
# SEND NEW CONVERSATION MESSAGE
# ==========================================================

class ConversationMessageCreateView(APIView):
    """
    POST: Send a new message within an existing conversation.

    Saves the user message as pending before calling OpenAI.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=ConversationMessageCreateSerializer,
        responses={
            200: OpenApiTypes.OBJECT,
            400: OpenApiTypes.OBJECT,
            401: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
            409: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
            502: OpenApiTypes.OBJECT,
            503: OpenApiTypes.OBJECT,
        },
        summary="Send a message in a conversation",
        description=(
            "Saves the user message as pending, sends it to OpenAI, "
            "and marks it completed or failed. Failed messages "
            "remain available for retry."
        ),
    )
    def post(self, request, id):

        # 1. Validate incoming message.
        request_serializer = ConversationMessageCreateSerializer(
            data=request.data
        )

        request_serializer.is_valid(raise_exception=True)

        message_text = request_serializer.validated_data["message"]

        # 2. Initialize OpenAI service.
        try:
            openai_service = OpenAIService()

        except ValueError:
            logger.exception(
                "OpenAI service configuration error."
            )

            return Response(
                {
                    "status": "error",
                    "message": "AI service is not configured correctly.",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # 3. Lock conversation and create pending message.
        with transaction.atomic():

            conversation = get_object_or_404(
                Conversation.objects.select_for_update().filter(
                    user=request.user,
                    is_archived=False,
                ),
                id=id,
            )

            # Prevent new messages while an earlier message
            # is pending or has failed.
            unresolved_message = ConversationMessage.objects.filter(
                conversation=conversation,
                role=ConversationMessage.Role.USER,
                status__in=[
                    ConversationMessage.Status.PENDING,
                    ConversationMessage.Status.FAILED,
                ],
            ).exists()

            if unresolved_message:
                return Response(
                    {
                        "status": "error",
                        "message": (
                            "This conversation has a pending or failed "
                            "message. Please wait for processing or "
                            "retry that message first."
                        ),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Use the last successful OpenAI response.
            previous_response_id = (
                conversation.last_response_id or None
            )

            # Save user message as pending.
            user_message = ConversationMessage.objects.create(
                conversation=conversation,
                role=ConversationMessage.Role.USER,
                content=message_text,
                status=ConversationMessage.Status.PENDING,
            )

            conversation.save(
                update_fields=["updated_at"]
            )

        # 4. Generate and save AI response.
        return generate_and_save_response(
            conversation=conversation,
            user_message=user_message,
            openai_service=openai_service,
            previous_response_id=previous_response_id,
        )


# ==========================================================
# RETRY FAILED MESSAGE API
# ==========================================================

class ConversationMessageRetryView(APIView):
    """
    POST: Retry an existing failed user message.

    Reuses the original message instead of creating a duplicate.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=None,
        responses={
            200: OpenApiTypes.OBJECT,
            401: OpenApiTypes.OBJECT,
            404: OpenApiTypes.OBJECT,
            409: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
            502: OpenApiTypes.OBJECT,
            503: OpenApiTypes.OBJECT,
        },
        summary="Retry a failed conversation message",
        description=(
            "Retries the latest failed user message without "
            "creating a duplicate user message."
        ),
    )
    def post(self, request, id, message_id):

        # 1. Initialize OpenAI service.
        try:
            openai_service = OpenAIService()

        except ValueError:
            logger.exception(
                "OpenAI service configuration error during retry."
            )

            return Response(
                {
                    "status": "error",
                    "message": "AI service is not configured correctly.",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # 2. Lock and validate the conversation and message.
        with transaction.atomic():

            conversation = get_object_or_404(
                Conversation.objects.select_for_update().filter(
                    user=request.user,
                    is_archived=False,
                ),
                id=id,
            )

            user_message = get_object_or_404(
                ConversationMessage.objects.select_for_update().filter(
                    conversation=conversation,
                    role=ConversationMessage.Role.USER,
                ),
                id=message_id,
            )

            # Only failed messages can be retried.
            if (
                user_message.status
                != ConversationMessage.Status.FAILED
            ):
                return Response(
                    {
                        "status": "error",
                        "message": (
                            "Only failed messages can be retried."
                        ),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Only retry the latest message to preserve conversation order.
            latest_message = (
                ConversationMessage.objects
                .filter(conversation=conversation)
                .order_by("-created_at", "-id")
                .first()
            )

            if (
                latest_message is None
                or latest_message.id != user_message.id
            ):
                return Response(
                    {
                        "status": "error",
                        "message": (
                            "This message cannot be retried because "
                            "newer messages already exist."
                        ),
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            # Mark the original message as pending.
            user_message.status = (
                ConversationMessage.Status.PENDING
            )
            user_message.error_message = ""

            user_message.save(
                update_fields=[
                    "status",
                    "error_message",
                    "updated_at",
                ]
            )

            previous_response_id = (
                conversation.last_response_id or None
            )

        # 3. Retry using the original message.
        return generate_and_save_response(
            conversation=conversation,
            user_message=user_message,
            openai_service=openai_service,
            previous_response_id=previous_response_id,
        )
