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

    def generate_response(self, message: str) -> str:

        try:
            response = self.client.responses.create(
                model=settings.OPENAI_MODEL,
                instructions=CHAT_SYSTEM_PROMPT,
                input=build_chat_user_prompt(message),
                max_output_tokens=self.max_output_tokens,
            )

            usage = extract_usage(response)

            log_token_usage(
                model=settings.OPENAI_MODEL,
                usage=usage,
            )

            answer = response.output_text

            if not answer:
                raise ValueError(
                    "The AI model returned an empty response."
                )

            return answer

        except OpenAIError:
            logger.exception(
                "OpenAI API request failed."
            )
            raise
