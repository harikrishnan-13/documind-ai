import logging
import os

from django.conf import settings
from openai import OpenAI, OpenAIError

from apps.ai_engine.prompts.chat import (
    CHAT_SYSTEM_PROMPT,
    build_chat_user_prompt,
)
from apps.ai_engine.services.usage_tracker import (
    extract_usage,
    log_token_usage,
)

logger = logging.getLogger(__name__)


class OpenAIService:

    def __init__(self):

        if not settings.OPENAI_API_KEY:
            raise ValueError(
                "OpenAI API key is not configured."
            )

        if not settings.OPENAI_MODEL:
            raise ValueError(
                "OpenAI model is not configured."
            )

        try:
            self.max_output_tokens = int(
                os.getenv("OPENAI_MAX_OUTPUT_TOKENS", "500")
            )
        except ValueError as exc:
            raise ValueError(
                "OPENAI_MAX_OUTPUT_TOKENS must be an integer."
            ) from exc

        if self.max_output_tokens <= 0:
            raise ValueError(
                "OPENAI_MAX_OUTPUT_TOKENS must be greater than zero."
            )

        self.client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=30.0,
            max_retries=2,
        )

    def generate_conversation_response(
        self,
        message: str,
        previous_response_id: str = None,
    ) -> dict:
        """
        Generate an AI response with optional conversation chaining.
        """

        try:
            request_data = {
                "model": settings.OPENAI_MODEL,
                "instructions": CHAT_SYSTEM_PROMPT,
                "input": build_chat_user_prompt(message),
                "max_output_tokens": self.max_output_tokens,
            }

            if previous_response_id:
                request_data["previous_response_id"] = (
                    previous_response_id
                )

            response = self.client.responses.create(
                **request_data
            )

            answer = response.output_text

            if not answer:
                raise ValueError(
                    "The AI model returned an empty response."
                )

            usage = extract_usage(response)

            log_token_usage(
                model=settings.OPENAI_MODEL,
                usage=usage,
            )

            return {
                "answer": answer,
                "response_id": response.id,
                "usage": usage,
            }

        except OpenAIError:
            logger.exception(
                "OpenAI API request failed."
            )
            raise

    def generate_response(self, message: str) -> str:
        """
        Backward-compatible single-turn chat method.
        """

        result = self.generate_conversation_response(
            message=message
        )

        return result["answer"]
