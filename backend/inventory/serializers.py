from rest_framework import serializers
from django.utils import timezone
from .models import Item, ItemCategory, InventoryTag, LendingSession, WaitingList
from organization.models import Club

class ItemCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCategory
        fields = '__all__'

class InventoryTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryTag
        fields = ['id', 'name', 'icon', 'club']
        read_only_fields = ['club'] 

class ItemSerializer(serializers.ModelSerializer):
    category_details = ItemCategorySerializer(source='category', read_only=True)
    tags_details = InventoryTagSerializer(source='tags', many=True, read_only=True)
    club_name = serializers.CharField(source='club.name', read_only=True)
    
    # Field to check availability instantly in the list
    active_loan = serializers.SerializerMethodField()
    queue_count = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            'id', 'club', 'club_name', 'category', 'category_details', 
            'title', 'description', 'image', 'tags', 'tags_details',
            'max_borrow_duration', 'status', 'internal_note', 
            'active_loan', 'queue_count', 'created_at'
        ]
        read_only_fields = ['club'] # Club is usually assigned automatically in the view

    def get_active_loan(self, obj):
        # Returns the current active session if exists (for Admins to see who has it)
        active = obj.lending_sessions.filter(status='ACTIVE').first()
        if active:
            return {
                "user_name": active.user.first_name, 
                "due_at": active.due_at,
                "is_guest": active.is_guest
            }
        return None

    def get_queue_count(self, obj):
        return obj.waiting_list.count()

class BatchItemCreateSerializer(serializers.Serializer):
    """
    Special serializer for creating multiple items at once.
    """
    title = serializers.CharField(max_length=200)
    quantity = serializers.IntegerField(min_value=1, max_value=50, default=1)
    category = serializers.PrimaryKeyRelatedField(queryset=ItemCategory.objects.all(), required=False, allow_null=True)
    description = serializers.CharField(required=False, allow_blank=True)
    image = serializers.FileField(required=False, allow_null=True)
    max_borrow_duration = serializers.IntegerField(default=60)
    tags = serializers.PrimaryKeyRelatedField(queryset=InventoryTag.objects.all(), many=True, required=False)
    internal_note = serializers.CharField(required=False, allow_blank=True)

class LendingSessionSerializer(serializers.ModelSerializer):
    item_title = serializers.CharField(source='item.title', read_only=True)
    item_image = serializers.FileField(source='item.image', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = LendingSession
        fields = [
            'id', 'item', 'item_title', 'item_image', 'user', 'user_name',
            'borrowed_at', 'due_at', 'returned_at', 'status', 'is_guest'
        ]
        read_only_fields = ['borrowed_at', 'due_at', 'returned_at', 'status', 'is_guest']

class WaitingListSerializer(serializers.ModelSerializer):
    item_details = ItemSerializer(source='item', read_only=True)
    
    class Meta:
        model = WaitingList
        fields = ['id', 'item', 'item_details', 'queued_at', 'notified_at']
        read_only_fields = ['queued_at', 'notified_at']