import uuid

from django.conf import settings
from django.db import models


class Conversation(models.Model):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations",
    )

    title = models.CharField(
        max_length=200,
        default="New conversation",
    )

    last_response_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    is_archived = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "AI_Conversation"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(
                fields=["user", "-updated_at"],
                name="idx_conv_user_updated",
            ),
            models.Index(
                fields=["user", "is_archived"],
                name="idx_conv_user_archived",
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.user.email})"


class ConversationMessage(models.Model):

    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
    )

    content = models.TextField()

    openai_response_id = models.CharField(
        max_length=255,
        blank=True,
        default="",
    )

    # Tracks whether message processing has succeeded.
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    # Stores a safe, user-visible processing error when applicable.
    error_message = models.TextField(
        blank=True,
        default="",
    )

    input_tokens = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    output_tokens = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    total_tokens = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "AI_ConversationMessage"
        ordering = ["created_at"]
        indexes = [
            models.Index(
                fields=["conversation", "created_at"],
                name="idx_msg_conv_created",
            ),
            models.Index(
                fields=["conversation", "status"],
                name="idx_msg_conv_status",
            ),
        ]

    def __str__(self):
        return f"{self.role}: {self.content[:50]}"
