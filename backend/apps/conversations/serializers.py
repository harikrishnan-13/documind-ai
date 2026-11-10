from rest_framework import serializers

from apps.conversations.models import (
    Conversation,
    ConversationMessage,
)


class ConversationMessageCreateSerializer(serializers.Serializer):
    """
    Validates a new user message.
    """

    message = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        max_length=10000,
    )


class ConversationMessageSerializer(serializers.ModelSerializer):
    """
    Serializes individual conversation messages.
    """

    class Meta:
        model = ConversationMessage

        fields = [
            "id",
            "role",
            "content",
            "openai_response_id",
            "input_tokens",
            "output_tokens",
            "total_tokens",
            "created_at",
        ]

        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and listing conversations.
    """

    message_count = serializers.IntegerField(
        read_only=True
    )

    class Meta:
        model = Conversation

        fields = [
            "id",
            "title",
            "is_archived",
            "message_count",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "message_count",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):

        user = self.context["request"].user

        return Conversation.objects.create(
            user=user,
            **validated_data,
        )


class ConversationDetailSerializer(serializers.ModelSerializer):
    """
    Returns conversation details with message history.
    """

    messages = ConversationMessageSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Conversation

        fields = [
            "id",
            "title",
            "is_archived",
            "messages",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields
