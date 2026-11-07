
from django.conf import settings
from openai import OpenAI, OpenAIError


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

    def generate_response(self, message):
        try:
            response = self.client.responses.create(
                model=settings.OPENAI_MODEL,
                instructions=(
                    "You are DocuMind AI, an intelligent document "
                    "assistant. Provide clear, accurate and helpful "
                    "answers. If you do not know something, "
                    "be honest and do not invent information."
                ),
                input=message,
                max_output_tokens=500,
            )

            return response.output_text

        except OpenAIError:
            # Log detailed errors on the backend in a later step.
            raise
