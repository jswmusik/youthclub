from rest_framework import serializers
from django.db import transaction
from django.http import QueryDict
import json
from .models import Questionnaire, Question, QuestionOption, QuestionnaireResponse, Answer
from rewards.serializers import RewardSerializer
from rewards.models import Reward

# --- Basic Component Serializers ---

class QuestionOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionOption
        fields = ['id', 'text', 'value', 'order']

class QuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, read_only=True)
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = Question
        fields = [
            'id', 'text', 'description', 'image', 'question_type', 
            'order', 'parent_question', 'trigger_option', 'options'
        ]
    
    def get_image(self, obj):
        """Return the full URL for the image if it exists."""
        if obj.image:
            request = self.context.get('request')
            image_url = obj.image.url
            if request:
                full_url = request.build_absolute_uri(image_url)
                print(f"[QuestionSerializer] Question {obj.id}: image={image_url}, full_url={full_url}")
                return full_url
            print(f"[QuestionSerializer] Question {obj.id}: image={image_url}, no request context")
            return image_url
        print(f"[QuestionSerializer] Question {obj.id}: no image")
        return None

# --- Questionnaire Display Serializers ---

class QuestionnaireListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dashboard lists."""
    is_completed = serializers.SerializerMethodField()
    is_started = serializers.SerializerMethodField()
    response_status = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    total_questions = serializers.SerializerMethodField()
    answered_questions = serializers.SerializerMethodField()
    
    class Meta:
        model = Questionnaire
        fields = [
            'id', 'title', 'description', 'status', 
            'start_date', 'expiration_date', 'is_anonymous',
            'municipality', 'club', 'is_completed', 'is_started', 
            'response_status', 'benefit_limit', 'progress', 
            'total_questions', 'answered_questions'
        ]

    def get_is_completed(self, obj):
        user = self.context.get('request').user
        if not user.is_authenticated:
            return False
        return QuestionnaireResponse.objects.filter(
            user=user, 
            questionnaire=obj, 
            status=QuestionnaireResponse.Status.COMPLETED
        ).exists()
    
    def get_is_started(self, obj):
        user = self.context.get('request').user
        if not user.is_authenticated:
            return False
        return QuestionnaireResponse.objects.filter(
            user=user, 
            questionnaire=obj, 
            status=QuestionnaireResponse.Status.STARTED
        ).exists()
    
    def get_response_status(self, obj):
        """Returns 'COMPLETED', 'STARTED', or None"""
        user = self.context.get('request').user
        if not user.is_authenticated:
            return None
        try:
            response = QuestionnaireResponse.objects.get(user=user, questionnaire=obj)
            return response.status
        except QuestionnaireResponse.DoesNotExist:
            return None
    
    def get_total_questions(self, obj):
        """Returns total number of questions in the questionnaire."""
        return obj.questions.count()
    
    def get_answered_questions(self, obj):
        """Returns number of questions the user has answered."""
        user = self.context.get('request').user
        if not user.is_authenticated:
            return 0
        try:
            response = QuestionnaireResponse.objects.get(user=user, questionnaire=obj)
            return response.answers.count()
        except QuestionnaireResponse.DoesNotExist:
            return 0
    
    def get_progress(self, obj):
        """Returns progress percentage (0-100) for started questionnaires."""
        total = self.get_total_questions(obj)
        if total == 0:
            return 0
        answered = self.get_answered_questions(obj)
        return round((answered / total) * 100)

class AnswerSerializer(serializers.ModelSerializer):
    """Serializer for existing answers."""
    question_id = serializers.IntegerField(source='question.id', read_only=True)
    selected_options = serializers.SerializerMethodField()
    
    class Meta:
        model = Answer
        fields = ['question_id', 'text_answer', 'rating_answer', 'selected_options']
    
    def get_selected_options(self, obj):
        return list(obj.selected_options.values_list('id', flat=True))

class QuestionnaireDetailSerializer(serializers.ModelSerializer):
    """Full details including questions and rewards."""
    questions = QuestionSerializer(many=True, read_only=True)
    rewards = RewardSerializer(many=True, read_only=True)
    existing_answers = serializers.SerializerMethodField()
    response_status = serializers.SerializerMethodField()
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = Questionnaire
        fields = [
            'id', 'title', 'description', 'status', 
            'start_date', 'expiration_date', 'is_anonymous',
            'questions', 'rewards', 'benefit_limit',
            'target_audience', 'visibility_group', 'existing_answers',
            'response_status', 'is_completed'
        ]
    
    def get_response_status(self, obj):
        """Returns 'COMPLETED', 'STARTED', or None"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        try:
            response = QuestionnaireResponse.objects.get(user=request.user, questionnaire=obj)
            return response.status
        except QuestionnaireResponse.DoesNotExist:
            return None
    
    def get_is_completed(self, obj):
        """Returns True if user has completed this questionnaire."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return QuestionnaireResponse.objects.filter(
            user=request.user,
            questionnaire=obj,
            status=QuestionnaireResponse.Status.COMPLETED
        ).exists()
    
    def get_existing_answers(self, obj):
        """Return existing answers for the current user if questionnaire is started or completed."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return {}
        
        try:
            # Check for both STARTED and COMPLETED responses
            response = QuestionnaireResponse.objects.get(
                user=request.user,
                questionnaire=obj
            )
            # Build a map: question_id -> answer data
            answers_map = {}
            for answer in response.answers.all():
                answer_data = {
                    'text_answer': answer.text_answer,
                    'rating_answer': answer.rating_answer,
                    'selected_options': list(answer.selected_options.values_list('id', flat=True))
                }
                answers_map[answer.question.id] = answer_data
            return answers_map
        except QuestionnaireResponse.DoesNotExist:
            return {}

# --- Admin Management Serializers ---

class QuestionOptionCreateSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False) # Allow ID for updates

    class Meta:
        model = QuestionOption
        fields = ['id', 'text', 'value', 'order']

class QuestionCreateSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    options = QuestionOptionCreateSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = [
            'id', 'text', 'description', 'image', 'question_type', 
            'order', 'parent_question', 'trigger_option', 'options'
        ]

class QuestionnaireAdminSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating questionnaires with nested questions."""
    questions = QuestionCreateSerializer(many=True, required=False)
    # Accept questions as JSON string for FormData compatibility
    questions_data = serializers.CharField(write_only=True, required=False, allow_blank=True)
    rewards = serializers.PrimaryKeyRelatedField(queryset=Reward.objects.all(), many=True, required=False)
    response_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Questionnaire
        fields = '__all__'
        read_only_fields = ('created_by', 'created_at', 'updated_at', 'admin_level', 'start_date', 'response_count')

    def to_internal_value(self, data):
        # Handle FormData: convert empty strings to None for nullable fields
        if isinstance(data, dict) or hasattr(data, 'get'):
            # Handle scheduled_publish_date: empty string should be None
            if 'scheduled_publish_date' in data:
                scheduled_val = data.get('scheduled_publish_date') if hasattr(data, 'get') else data.get('scheduled_publish_date', '')
                if scheduled_val == '' or scheduled_val == 'null' or scheduled_val is None:
                    # Convert to mutable dict if needed
                    if isinstance(data, QueryDict):
                        data = data.copy()
                    elif hasattr(data, '_mutable'):
                        data = data.copy()
                    elif not isinstance(data, dict):
                        data = dict(data)
                    data['scheduled_publish_date'] = None
        
        # Handle FormData: parse questions_data JSON string if present
        if 'questions_data' in data and isinstance(data['questions_data'], str) and data['questions_data']:
            try:
                questions_json = json.loads(data['questions_data'])
                # Convert to mutable dict if needed (for QueryDict)
                if hasattr(data, '_mutable'):
                    data = data.copy()
                elif not isinstance(data, dict):
                    # Convert QueryDict or other types to dict
                    data = dict(data)
                
                # Store image file keys for later matching in create method
                # We'll match them in create() where we have access to request.FILES
                data['questions'] = questions_json
            except (json.JSONDecodeError, ValueError) as e:
                raise serializers.ValidationError({"questions_data": f"Invalid JSON format: {str(e)}"})
        
        # Handle FormData: ensure rewards is always a list
        # FormData sends multiple values with same key, but DRF might parse incorrectly
        if 'rewards' in data:
            # Convert to mutable dict if needed (for QueryDict)
            if isinstance(data, QueryDict):
                data = data.copy()
            elif hasattr(data, '_mutable'):
                data = data.copy()
            elif not isinstance(data, dict):
                data = dict(data)
            
            # Handle QueryDict (FormData) - get all values for 'rewards' key
            if isinstance(data, QueryDict) or hasattr(data, 'getlist'):
                rewards_list = data.getlist('rewards') if hasattr(data, 'getlist') else []
                if rewards_list:
                    # Convert to list of integers
                    try:
                        data['rewards'] = [int(r) for r in rewards_list if r and str(r).strip()]
                    except (ValueError, TypeError):
                        raise serializers.ValidationError({"rewards": "Invalid reward IDs."})
                else:
                    data['rewards'] = []
            # Handle if it's already a string (single value from FormData)
            elif isinstance(data.get('rewards'), str):
                rewards_str = data['rewards']
                try:
                    # Try parsing as JSON first
                    rewards_json = json.loads(rewards_str)
                    if isinstance(rewards_json, list):
                        data['rewards'] = [int(r) for r in rewards_json if r]
                    else:
                        data['rewards'] = [int(rewards_str)] if rewards_str.strip() else []
                except (json.JSONDecodeError, ValueError):
                    # Not JSON, treat as single ID or comma-separated
                    if ',' in rewards_str:
                        data['rewards'] = [int(r.strip()) for r in rewards_str.split(',') if r.strip()]
                    else:
                        data['rewards'] = [int(rewards_str)] if rewards_str.strip() else []
            # If it's already a list, ensure all items are integers
            elif isinstance(data.get('rewards'), list):
                try:
                    data['rewards'] = [int(r) for r in data['rewards'] if r is not None]
                except (ValueError, TypeError):
                    raise serializers.ValidationError({"rewards": "Invalid reward IDs."})
            else:
                # Single value, convert to list
                rewards_val = data.get('rewards')
                if rewards_val:
                    try:
                        data['rewards'] = [int(rewards_val)]
                    except (ValueError, TypeError):
                        raise serializers.ValidationError({"rewards": "Invalid reward IDs."})
                else:
                    data['rewards'] = []
        
        return super().to_internal_value(data)

    @transaction.atomic
    def create(self, validated_data):
        # Remove questions_data if present (it's not a model field, just used for FormData parsing)
        validated_data.pop('questions_data', None)
        
        questions_data = validated_data.pop('questions', [])
        rewards_data = validated_data.pop('rewards', [])
        
        # Handle publish logic: if status is PUBLISHED, set start_date to now
        # unless scheduled_publish_date is set and in the future
        from django.utils import timezone
        status = validated_data.get('status', Questionnaire.Status.DRAFT)
        scheduled_publish_date = validated_data.get('scheduled_publish_date')
        
        if status == Questionnaire.Status.PUBLISHED:
            if scheduled_publish_date and scheduled_publish_date > timezone.now():
                # Scheduled for future - keep status as PUBLISHED but don't set start_date yet
                # start_date will be set when scheduled_publish_date is reached (via management command)
                pass
            else:
                # Publish immediately - set start_date to now
                validated_data['start_date'] = timezone.now()
        
        # Get request from context to access FILES
        request = self.context.get('request')
        files = request.FILES if request else {}
        
        # Match image files to questions by index
        # Images are sent as question_image_0, question_image_1, etc.
        for index, q_data in enumerate(questions_data):
            image_key = f'question_image_{index}'
            if image_key in files:
                q_data['image'] = files[image_key]
                print(f"[Serializer CREATE] Question at index {index}: Image file provided: {image_key}")
            else:
                print(f"[Serializer CREATE] Question at index {index}: No image file (key: {image_key})")
        
        questionnaire = Questionnaire.objects.create(**validated_data)
        questionnaire.rewards.set(rewards_data)

        # Map to store temporary question IDs (frontend ID -> database ID) if needed for parenting
        # For simplicity, we assume strictly ordered creation or 2-pass if parent refs exist
        # Here we do a simple pass, assuming parents are created before children or handled via update
        
        # Note: Handling nested recursive creation in one go is complex. 
        # We will create them all, then link parents in a second pass if necessary.
        
        created_questions = {} # map order -> instance

        for q_data in questions_data:
            options_data = q_data.pop('options', [])
            # Remove parent/trigger temporarily to avoid FK errors if they don't exist yet
            parent = q_data.pop('parent_question', None)
            trigger = q_data.pop('trigger_option', None)
            
            # Log image before creating
            image_info = q_data.get('image')
            print(f"[Serializer CREATE] Creating question with image: {image_info.url if hasattr(image_info, 'url') else image_info}")
            
            question = Question.objects.create(questionnaire=questionnaire, **q_data)
            print(f"[Serializer CREATE] Created question {question.id} with image: {question.image.url if question.image else 'None'}")
            created_questions[question.order] = question
            
            # Create Options
            for opt_data in options_data:
                QuestionOption.objects.create(question=question, **opt_data)

        # 2nd Pass: Link Logic (if provided)
        # This requires the frontend to send the 'order' index as reference for parents
        # For this MVP, we will rely on separate update calls for complex logic 
        # or simplified structure.
        
        return questionnaire

    @transaction.atomic
    def update(self, instance, validated_data):
        # Remove questions_data if present (it's not a model field, just used for FormData parsing)
        validated_data.pop('questions_data', None)
        
        # Handle publish logic: if status changes to PUBLISHED, set start_date to now
        # unless scheduled_publish_date is set and in the future
        from django.utils import timezone
        new_status = validated_data.get('status', instance.status)
        scheduled_publish_date = validated_data.get('scheduled_publish_date', instance.scheduled_publish_date)
        
        # If status is changing to PUBLISHED
        if new_status == Questionnaire.Status.PUBLISHED and instance.status != Questionnaire.Status.PUBLISHED:
            if scheduled_publish_date and scheduled_publish_date > timezone.now():
                # Scheduled for future - keep status as PUBLISHED but don't set start_date yet
                # start_date will be set when scheduled_publish_date is reached (via management command)
                pass
            else:
                # Publish immediately - set start_date to now
                validated_data['start_date'] = timezone.now()
                # Clear scheduled_publish_date if it was set but is now in the past
                if scheduled_publish_date and scheduled_publish_date <= timezone.now():
                    validated_data['scheduled_publish_date'] = None
        
        # Update main fields
        instance.title = validated_data.get('title', instance.title)
        instance.description = validated_data.get('description', instance.description)
        instance.status = validated_data.get('status', instance.status)
        instance.expiration_date = validated_data.get('expiration_date', instance.expiration_date)
        instance.is_anonymous = validated_data.get('is_anonymous', instance.is_anonymous)
        instance.target_audience = validated_data.get('target_audience', instance.target_audience)
        instance.visibility_group = validated_data.get('visibility_group', instance.visibility_group)
        instance.scheduled_publish_date = validated_data.get('scheduled_publish_date', instance.scheduled_publish_date)
        
        # Only update start_date if it was explicitly set (e.g., when publishing)
        if 'start_date' in validated_data:
            instance.start_date = validated_data['start_date']
        
        if 'rewards' in validated_data:
            instance.rewards.set(validated_data['rewards'])
            
        instance.save()
        
        # Full question replacement/update logic is complex.
        # Strategies:
        # 1. Delete all and recreate (easiest, but loses historical data if survey was live)
        # 2. Smart diffing.
        # For MVP, if status is DRAFT, we can clear and recreate.
        if instance.status == Questionnaire.Status.DRAFT and 'questions' in validated_data:
             questions_data = validated_data.pop('questions', [])
             
             # Get request from context to access FILES
             request = self.context.get('request')
             files = request.FILES if request else {}
             
             # Store existing questions by ID for image preservation BEFORE deletion
             # We need to read the file content before deletion because FileField references become invalid after deletion
             from django.core.files.base import ContentFile
             
             existing_questions = {}
             for q in instance.questions.all():
                 if q.id and q.image:
                     try:
                         # Read the file content NOW, before deletion
                         with q.image.open('rb') as f:
                             file_content = f.read()
                         existing_questions[q.id] = {
                             'file_content': file_content,
                             'image_name': q.image.name
                         }
                         print(f"[Serializer UPDATE] Stored image for question {q.id}: {q.image.name} ({len(file_content)} bytes)")
                     except Exception as e:
                         print(f"[Serializer UPDATE] Error reading image for question {q.id}: {e}")
                         existing_questions[q.id] = {'file_content': None, 'image_name': None}
                 elif q.id:
                     existing_questions[q.id] = {'file_content': None, 'image_name': None}
             
             print(f"[Serializer UPDATE] Found {len(existing_questions)} existing questions with IDs")
             print(f"[Serializer UPDATE] Available files: {list(files.keys())}")
             
             # Match image files to questions by index
             # Also handle existing images: if question has an ID and no new image is provided, preserve existing
             for index, q_data in enumerate(questions_data):
                 image_key = f'question_image_{index}'
                 question_id = q_data.get('id')
                 
                 if image_key in files:
                     # New image file provided
                     q_data['image'] = files[image_key]
                     print(f"[Serializer UPDATE] Question {question_id or 'new'} at index {index}: New image file provided ({image_key})")
                 elif question_id and question_id in existing_questions:
                     # Existing question - preserve image if no new one provided
                     existing_q_data = existing_questions[question_id]
                     if existing_q_data['file_content'] and existing_q_data['image_name']:
                         # Recreate the file from stored content
                         q_data['image'] = ContentFile(existing_q_data['file_content'], name=existing_q_data['image_name'])
                         print(f"[Serializer UPDATE] Question {question_id} at index {index}: Preserving existing image: {existing_q_data['image_name']}")
                     else:
                         print(f"[Serializer UPDATE] Question {question_id} at index {index}: No existing image to preserve")
                 else:
                     print(f"[Serializer UPDATE] Question {question_id or 'new'} at index {index}: No image (no file, no existing)")
             
             instance.questions.all().delete() # Wipe old questions
             
             for q_data in questions_data:
                options_data = q_data.pop('options', [])
                q_data.pop('parent_question', None)
                q_data.pop('trigger_option', None)
                
                # Remove 'id' from q_data since we're creating new instances
                q_data.pop('id', None)
                
                question = Question.objects.create(questionnaire=instance, **q_data)
                print(f"[Serializer UPDATE] Created question {question.id} with image: {question.image.url if question.image else 'None'}")
                for opt_data in options_data:
                    QuestionOption.objects.create(question=question, **opt_data)

        return instance

# --- Submission Serializers ---

class AnswerInputSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    text_answer = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    rating_answer = serializers.IntegerField(required=False, allow_null=True)
    selected_options = serializers.ListField(child=serializers.IntegerField(), required=False, allow_null=True)

class ResponseSubmissionSerializer(serializers.Serializer):
    questionnaire_id = serializers.IntegerField()
    answers = AnswerInputSerializer(many=True)

    def validate_questionnaire_id(self, value):
        if not Questionnaire.objects.filter(id=value, status='PUBLISHED').exists():
            raise serializers.ValidationError("Questionnaire not found or not active.")
        return value