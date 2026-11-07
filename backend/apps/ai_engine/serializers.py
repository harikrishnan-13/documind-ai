
from rest_framework import serializers


class AIChatSerializer(serializers.Serializer):

    message = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=10000,
        trim_whitespace=True,
    )


class AIChatResponseSerializer(serializers.Serializer):

    status = serializers.CharField()

    message = serializers.CharField()

    data = serializers.DictField(
        child=serializers.CharField()
    )
