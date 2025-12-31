from rest_framework import serializers
from .models import CustomFieldDefinition, CustomFieldValue, EventCustomField, EventRegistrationCustomFieldValue
from organization.serializers import ClubSerializer

class CustomFieldDefinitionSerializer(serializers.ModelSerializer):
    # Used to show which specific clubs are selected (read-only)
    specific_clubs_details = ClubSerializer(source='specific_clubs', many=True, read_only=True)
    
    class Meta:
        model = CustomFieldDefinition
        fields = [
            'id', 'name', 'help_text', 'field_type', 'options',
            'required', 'is_published', 'context', 'target_roles',
            'owner_role', 'municipality', 'club', 'specific_clubs', 'specific_clubs_details',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'owner_role', 'municipality', 'club']

    def validate(self, data):
        """
        Ensure that Select fields have options.
        """
        field_type = data.get('field_type')
        options = data.get('options')

        if field_type in ['SINGLE_SELECT', 'MULTI_SELECT']:
            if not options or not isinstance(options, list) or len(options) == 0:
                raise serializers.ValidationError({
                    "options": "Options list is required for Select fields."
                })
        return data

class CustomFieldValueSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomFieldValue
        fields = ['id', 'field', 'user', 'value']


class CustomFieldUserViewSerializer(CustomFieldDefinitionSerializer):
    """
    Used when a User views fields applicable to them.
    Includes the user's saved value for this field.
    """
    value = serializers.SerializerMethodField()

    class Meta(CustomFieldDefinitionSerializer.Meta):
        fields = CustomFieldDefinitionSerializer.Meta.fields + ['value']

    def get_value(self, obj):
        # 'context' is passed from the View
        user = self.context.get('user')
        if user and user.is_authenticated:
            # Try to find a value for this field and user
            # We use the related name 'values' from the model definition
            val_obj = obj.values.filter(user=user).first()
            return val_obj.value if val_obj else None
        return None


# ============================================================================
# Event Custom Field Serializers
# ============================================================================

class EventCustomFieldSerializer(serializers.ModelSerializer):
    """
    Serializer for the through model linking CustomFieldDefinition to Event.
    Used when creating/updating events with custom fields.
    """
    field_id = serializers.IntegerField(write_only=True, source='field.id')
    field_detail = CustomFieldDefinitionSerializer(source='field', read_only=True)
    
    class Meta:
        model = EventCustomField
        fields = ['id', 'field_id', 'field_detail', 'is_required', 'order']
        read_only_fields = ['id']


class EventCustomFieldWriteSerializer(serializers.Serializer):
    """
    Simplified serializer for writing event custom fields.
    Used in the EventSerializer for nested writes.
    """
    field_id = serializers.IntegerField()
    is_required = serializers.BooleanField(default=False)
    order = serializers.IntegerField(default=0)


class EventRegistrationCustomFieldValueSerializer(serializers.ModelSerializer):
    """
    Serializer for custom field values submitted during event registration.
    """
    field_detail = CustomFieldDefinitionSerializer(source='field', read_only=True)
    
    class Meta:
        model = EventRegistrationCustomFieldValue
        fields = ['id', 'field', 'field_detail', 'value', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class EventRegistrationCustomFieldValueWriteSerializer(serializers.Serializer):
    """
    Simplified serializer for submitting custom field values during registration.
    Expected format: { "field_id": value }
    """
    pass  # We'll handle this as a dict in the view