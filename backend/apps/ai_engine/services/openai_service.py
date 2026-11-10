
from django.conf import settings
from openai import OpenAI, OpenAIError

from apps.ai_engine.prompts.chat import (
    CHAT_SYSTEM_PROMPT,
    build_chat_user_prompt,
)


class OpenAIService:

    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise ValueError("OpenAI API key is not configured.")

        if not settings.OPENAI_MODEL:
            raise ValueError("OpenAI model is not configured.")

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
                max_output_tokens=500,
            )

            return response.output_text

        except OpenAIError:
            raise
