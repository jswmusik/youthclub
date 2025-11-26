import json
from rest_framework import serializers
from .models import NewsTag, NewsArticle

class NewsTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsTag
        fields = ['id', 'name', 'slug']

class NewsArticleSerializer(serializers.ModelSerializer):
    # Read-only field to display the author's name nicely
    author_name = serializers.SerializerMethodField()
    
    # Read-only field to display full tag objects (for the UI chips)
    tags_details = NewsTagSerializer(source='tags', many=True, read_only=True)
    
    # We accept a JSON string for target_roles because we are using FormData (for images)
    target_roles_data = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = NewsArticle
        fields = [
            'id', 
            'title', 
            'excerpt', 
            'content', 
            'hero_image',
            'author', 
            'author_name', 
            'tags',          # Used for writing (sending IDs like [1, 2])
            'tags_details',  # Used for reading (getting objects like [{id:1, name:"Sports"}])
            'target_roles', 
            'target_roles_data',  # Used for writing (JSON string from FormData)
            'is_published', 
            'is_hero',
            'published_at', 
            'updated_at'
        ]
        # 'tags' is fine for input, but we primarily read 'tags_details'
        extra_kwargs = {
            'tags': {'required': False},
            'target_roles': {'read_only': True}  # Make target_roles read-only since we use target_roles_data for writing
        }

    def get_author_name(self, obj):
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email
        return "Unknown"

    def create(self, validated_data):
        # Handle target_roles_data JSON string
        target_roles_json = validated_data.pop('target_roles_data', None)
        if target_roles_json:
            try:
                validated_data['target_roles'] = json.loads(target_roles_json)
            except json.JSONDecodeError:
                validated_data['target_roles'] = ['ALL']  # Default fallback
        elif 'target_roles' not in validated_data:
            validated_data['target_roles'] = ['ALL']  # Default if not provided
        
        # Automatically set the author to the current user if not provided
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['author'] = request.user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        # Handle target_roles_data JSON string
        target_roles_json = validated_data.pop('target_roles_data', None)
        if target_roles_json:
            try:
                validated_data['target_roles'] = json.loads(target_roles_json)
            except json.JSONDecodeError:
                pass  # Keep existing value if JSON is invalid
        
        return super().update(instance, validated_data)