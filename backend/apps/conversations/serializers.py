from rest_framework import serializers

from apps.conversations.models import Conversation, ConversationMessage


class ConversationMessageCreateSerializer(serializers.Serializer):
    message = serializers.CharField(
        required=True,
        allow_blank=False,
        trim_whitespace=True,
        max_length=10000,
    )

    def validate_message(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Message cannot be empty."
            )

        return value


class ConversationMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConversationMessage
        fields = [
            "id",
            "role",
            "content",
            "status",
            "error_message",
            "openai_response_id",
            "input_tokens",
            "output_tokens",
            "total_tokens",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(read_only=True)

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
            "is_archived",
            "message_count",
            "created_at",
            "updated_at",
        ]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ConversationDetailSerializer(serializers.ModelSerializer):
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
