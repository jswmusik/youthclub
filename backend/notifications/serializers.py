# backend/notifications/serializers.py
from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'category', 'title', 'body', 'action_url', 'is_read', 'created_at']
        read_only_fields = ['id', 'category', 'title', 'body', 'action_url', 'created_at']