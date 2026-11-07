
import logging

from openai import OpenAIError

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from drf_spectacular.utils import extend_schema

from .serializers import (
    AIChatSerializer,
    AIChatResponseSerializer,
)

from .services.openai_service import OpenAIService


logger = logging.getLogger(__name__)


class AIChatView(APIView):

    permission_classes = [IsAuthenticated]

    @extend_schema(
        request=AIChatSerializer,
        responses={
            200: AIChatResponseSerializer,
        },
        description="Send a message to DocuMind AI and receive an AI-generated response.",
        summary="Chat with DocuMind AI",
    )
    def post(self, request):

        serializer = AIChatSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST,
            )

        message = serializer.validated_data["message"]

        try:
            ai_service = OpenAIService()
            answer = ai_service.generate_response(message)

            return Response(
                {
                    "status": "success",
                    "message": "AI response generated successfully",
                    "data": {
                        "question": message,
                        "answer": answer,
                    },
                },
                status=status.HTTP_200_OK,
            )

        except ValueError:
            logger.exception("AI service configuration error")

            return Response(
                {"error": "AI service is not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        except OpenAIError:
            logger.exception("OpenAI API request failed")

            return Response(
                {"error": "Unable to generate an AI response."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
