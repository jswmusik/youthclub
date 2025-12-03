from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Avg, Count
from django.utils import timezone
from django.db import transaction
from django.http import HttpResponse

from .models import Questionnaire, Question, QuestionOption, QuestionnaireResponse, Answer
from .serializers import (
    QuestionnaireListSerializer, QuestionnaireDetailSerializer, 
    QuestionnaireAdminSerializer, ResponseSubmissionSerializer
)
from .permissions import IsQuestionnaireOwnerOrHigher
from .utils import generate_response_pdf
from rewards.models import RewardUsage
from users.models import User


def create_questionnaire_completion_activity_post(response):
    """
    Creates a post that appears in the user's activity feed when they complete a questionnaire.
    This post will show up in their activity timeline.
    """
    from posts.models import Post
    
    questionnaire = response.questionnaire
    user = response.user
    completed_date = response.completed_at or timezone.now()
    
    # Only create posts for youth members
    if user.role != User.Role.YOUTH_MEMBER:
        return
    
    # Format the date nicely
    date_str = completed_date.strftime('%B %d, %Y')
    time_str = completed_date.strftime('%I:%M %p')
    
    # Build reward text if applicable
    reward_text = ""
    if response.is_benefit_claimed and questionnaire.rewards.exists():
        reward_names = [r.name for r in questionnaire.rewards.all()[:3]]
        if len(reward_names) == 1:
            reward_text = f"<p>🎁 Earned reward: <strong>{reward_names[0]}</strong></p>"
        elif len(reward_names) > 1:
            reward_text = f"<p>🎁 Earned {len(reward_names)} rewards!</p>"
    
    # Create the post content
    post_content = (
        f"<p>✅ <strong>Completed Questionnaire: {questionnaire.title}</strong></p>"
        f"<p>Completed on {date_str} at {time_str}</p>"
    )
    if questionnaire.description:
        post_content += f"<p>{questionnaire.description[:100]}{'...' if len(questionnaire.description) > 100 else ''}</p>"
    if reward_text:
        post_content += reward_text
    
    # Determine owner role based on questionnaire scope
    owner_role = Post.OwnerRole.SUPER_ADMIN
    if questionnaire.club:
        owner_role = Post.OwnerRole.CLUB_ADMIN
    elif questionnaire.municipality:
        owner_role = Post.OwnerRole.MUNICIPALITY_ADMIN
    
    try:
        # Create the activity post
        activity_post = Post.objects.create(
            title=f"Completed Questionnaire: {questionnaire.title}",
            content=post_content,
            post_type=Post.PostType.TEXT,
            
            # Ownership - user is the author of their own activity
            author=user,
            owner_role=owner_role,
            club=questionnaire.club,
            municipality=questionnaire.municipality,
            is_global=(questionnaire.club is None and questionnaire.municipality is None),
            
            # Targeting - only visible to the user
            target_member_type=Post.TargetMemberType.YOUTH,
            
            # Settings
            status=Post.Status.PUBLISHED,
            published_at=completed_date,  # Use completion date for chronological ordering
            allow_comments=False,  # Activity posts don't need comments
            is_pinned=False
        )
        
        # Target the club/municipality/group if applicable so the post is visible
        if questionnaire.club:
            activity_post.target_clubs.add(questionnaire.club)
        elif questionnaire.municipality:
            # For municipality-level questionnaires, target all clubs in that municipality
            from organization.models import Club
            municipality_clubs = Club.objects.filter(municipality=questionnaire.municipality)
            activity_post.target_clubs.set(municipality_clubs)
        elif questionnaire.visibility_group:
            activity_post.target_groups.add(questionnaire.visibility_group)
        
        print(f"✅ Created activity post for {user.email} completing questionnaire '{questionnaire.title}' (Post ID: {activity_post.id})")
    except Exception as e:
        print(f"❌ Error creating activity post for questionnaire completion: {e}")
        import traceback
        traceback.print_exc()

class QuestionnaireAdminViewSet(viewsets.ModelViewSet):
    """
    Viewset for Admins to Manage Questionnaires.
    """
    permission_classes = [permissions.IsAuthenticated, IsQuestionnaireOwnerOrHigher]
    serializer_class = QuestionnaireAdminSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title']
    ordering_fields = ['created_at', 'start_date']

    def get_queryset(self):
        user = self.request.user
        
        if user.role == User.Role.SUPER_ADMIN:
            queryset = Questionnaire.objects.all()
        elif user.role == User.Role.MUNICIPALITY_ADMIN:
            # See global ones created by them OR ones in their municipality
            queryset = Questionnaire.objects.filter(
                Q(municipality=user.assigned_municipality) | 
                Q(created_by=user)
            ).distinct()
        elif user.role == User.Role.CLUB_ADMIN:
            queryset = Questionnaire.objects.filter(club=user.assigned_club)
        else:
            return Questionnaire.objects.none()
        
        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            if status_filter == 'ARCHIVED':
                # ARCHIVED means expired questionnaires (regardless of actual status)
                now = timezone.now()
                queryset = queryset.filter(expiration_date__lt=now)
            else:
                queryset = queryset.filter(status=status_filter)
        
        # Filter by municipality if provided (for SUPER_ADMIN)
        municipality_filter = self.request.query_params.get('municipality')
        if municipality_filter and user.role == User.Role.SUPER_ADMIN:
            queryset = queryset.filter(municipality_id=municipality_filter)
        
        # Filter by club if provided (for SUPER_ADMIN)
        club_filter = self.request.query_params.get('club')
        if club_filter and user.role == User.Role.SUPER_ADMIN:
            queryset = queryset.filter(club_id=club_filter)
        
        # Annotate response count to avoid N+1 queries
        from .models import QuestionnaireResponse
        queryset = queryset.annotate(
            response_count=Count(
                'responses',
                filter=Q(responses__status=QuestionnaireResponse.Status.COMPLETED)
            )
        )
        
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        extra_data = {'created_by': user}
        
        if user.role == User.Role.MUNICIPALITY_ADMIN:
            extra_data['municipality'] = user.assigned_municipality
            extra_data['admin_level'] = Questionnaire.AdminLevel.MUNICIPALITY_ADMIN
        elif user.role == User.Role.CLUB_ADMIN:
            extra_data['club'] = user.assigned_club
            # Link to muni parent if possible
            if user.assigned_club and user.assigned_club.municipality:
                extra_data['municipality'] = user.assigned_club.municipality 
            extra_data['admin_level'] = Questionnaire.AdminLevel.CLUB_ADMIN
        else:
            extra_data['admin_level'] = Questionnaire.AdminLevel.SUPER_ADMIN
            
        serializer.save(**extra_data)

    @action(detail=False, methods=['get'])
    def summary_analytics(self, request):
        """
        Get summary analytics for all questionnaires visible to the admin.
        Returns: total_created, total_completed, total_started
        """
        queryset = self.get_queryset()
        
        # Count total questionnaires created
        total_created = queryset.count()
        
        # Count questionnaires with at least one completed response
        completed_questionnaires = queryset.filter(
            responses__status=QuestionnaireResponse.Status.COMPLETED
        ).distinct().count()
        
        # Count questionnaires with at least one started response
        # (A questionnaire can have both started and completed responses from different users)
        started_questionnaires = queryset.filter(
            responses__status=QuestionnaireResponse.Status.STARTED
        ).distinct().count()
        
        return Response({
            'total_created': total_created,
            'total_completed': completed_questionnaires,
            'total_started': started_questionnaires,
        })
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """
        Aggregate results for the admin dashboard.
        """
        questionnaire = self.get_object()
        responses = questionnaire.responses.filter(status=QuestionnaireResponse.Status.COMPLETED)
        total_responses = responses.count()
        
        # Calculate total eligible users (members sent to)
        # Use the same logic as in signals.py to find eligible users
        candidates = User.objects.filter(
            is_active=True
        )
        
        query_filter = Q()
        
        # A. Group Targeting (Overrides everything else)
        if questionnaire.visibility_group:
            group_member_ids = questionnaire.visibility_group.memberships.filter(
                status='APPROVED'
            ).values_list('user_id', flat=True)
            query_filter = Q(id__in=group_member_ids)
        else:
            # B. Scope Targeting
            global_q = Q()
            if not questionnaire.municipality and not questionnaire.club:
                global_q = Q()  # All users
            
            muni_q = Q()
            if questionnaire.municipality and not questionnaire.club:
                muni_q = Q(preferred_club__municipality=questionnaire.municipality)
            
            club_q = Q()
            if questionnaire.club:
                club_q = Q(preferred_club=questionnaire.club)
            
            # C. Role Targeting
            role_q = Q()
            if questionnaire.target_audience == Questionnaire.TargetAudience.YOUTH:
                role_q = Q(role=User.Role.YOUTH_MEMBER)
            elif questionnaire.target_audience == Questionnaire.TargetAudience.GUARDIAN:
                role_q = Q(role=User.Role.GUARDIAN)
            elif questionnaire.target_audience == Questionnaire.TargetAudience.BOTH:
                role_q = Q(role__in=[User.Role.YOUTH_MEMBER, User.Role.GUARDIAN])
            
            scope_q = global_q | muni_q | club_q
            query_filter = scope_q & role_q
        
        eligible_users = candidates.filter(query_filter).distinct()
        total_eligible = eligible_users.count()
        
        # Gender breakdown of responses
        gender_breakdown = {'male': 0, 'female': 0, 'other': 0}
        if total_responses > 0:
            # Get user IDs from completed responses
            response_user_ids = responses.values_list('user_id', flat=True)
            response_users = User.objects.filter(id__in=response_user_ids)
            
            for user in response_users:
                if user.legal_gender == User.Gender.MALE:
                    gender_breakdown['male'] += 1
                elif user.legal_gender == User.Gender.FEMALE:
                    gender_breakdown['female'] += 1
                elif user.legal_gender == User.Gender.OTHER:
                    gender_breakdown['other'] += 1
                else:
                    # If gender is empty/null, count as 'other'
                    gender_breakdown['other'] += 1
        
        data = {
            "total_responses": total_responses,
            "total_eligible": total_eligible,
            "gender_breakdown": gender_breakdown,
            "questionnaire_info": {
                "id": questionnaire.id,
                "title": questionnaire.title,
                "description": questionnaire.description,
                "status": questionnaire.status,
                "start_date": questionnaire.start_date.isoformat() if questionnaire.start_date else None,
                "expiration_date": questionnaire.expiration_date.isoformat() if questionnaire.expiration_date else None,
                "scheduled_publish_date": questionnaire.scheduled_publish_date.isoformat() if questionnaire.scheduled_publish_date else None,
                "is_anonymous": questionnaire.is_anonymous,
                "target_audience": questionnaire.target_audience,
                "municipality": questionnaire.municipality.name if questionnaire.municipality else None,
                "club": questionnaire.club.name if questionnaire.club else None,
                "visibility_group": questionnaire.visibility_group.name if questionnaire.visibility_group else None,
                "benefit_limit": questionnaire.benefit_limit,
                "rewards": [{"id": r.id, "name": r.name} for r in questionnaire.rewards.all()],
            },
            "questions": []
        }
        
        for question in questionnaire.questions.all().order_by('order'):
            q_data = {
                "id": question.id,
                "text": question.text,
                "type": question.question_type,
                "answers": []
            }
            
            # Aggregation Logic
            if question.question_type in ['SINGLE_CHOICE', 'MULTI_CHOICE']:
                for opt in question.options.all():
                    # Count how many answers selected this option
                    count = Answer.objects.filter(
                        question=question, 
                        selected_options=opt,
                        response__status=QuestionnaireResponse.Status.COMPLETED
                    ).count()
                    
                    q_data["answers"].append({
                        "option": opt.text,
                        "count": count,
                        "percentage": round((count / total_responses * 100), 1) if total_responses > 0 else 0
                    })
                    
            elif question.question_type == 'RATING':
                # Average rating
                stats = Answer.objects.filter(
                    question=question,
                    response__status=QuestionnaireResponse.Status.COMPLETED
                ).aggregate(avg=Avg('rating_answer'))
                q_data["average_rating"] = round(stats['avg'] or 0, 1)
                
            elif question.question_type == 'FREE_TEXT':
                # Return latest 5 answers for preview (full list via separate paginated endpoint if needed)
                texts = Answer.objects.filter(
                    question=question,
                    response__status=QuestionnaireResponse.Status.COMPLETED
                ).exclude(text_answer__exact='').values_list('text_answer', flat=True)[:10]
                q_data["latest_text_answers"] = list(texts)
                
            data["questions"].append(q_data)
            
        return Response(data)

    @action(detail=True, methods=['get'], url_path='download_response_pdf')
    def download_response_pdf(self, request, pk=None):
        """
        Download a PDF for a specific response.
        Usage: /api/questionnaires/manage/{id}/download_response_pdf/?response_id={response_id}
        """
        questionnaire = self.get_object()
        response_id = request.query_params.get('response_id')
        
        if not response_id:
            return Response({"error": "response_id parameter is required"}, status=400)
        
        try:
            response = QuestionnaireResponse.objects.get(id=response_id, questionnaire=questionnaire)
        except QuestionnaireResponse.DoesNotExist:
            return Response({"error": "Response not found"}, status=404)
            
        # Check anonymity
        if questionnaire.is_anonymous:
             # Admin can still download the PDF, but the generator handles hiding the name.
             pass

        pdf_buffer = generate_response_pdf(response)
        
        filename = f"survey_{questionnaire.id}_response_{response.id}.pdf"
        http_response = HttpResponse(pdf_buffer, content_type='application/pdf')
        http_response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return http_response


class UserQuestionnaireViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Viewset for Members (Youth/Guardians) to list and take questionnaires.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return QuestionnaireDetailSerializer
        return QuestionnaireListSerializer

    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve to create a STARTED response when user opens a questionnaire.
        Only creates STARTED if no response exists (don't overwrite COMPLETED).
        """
        instance = self.get_object()
        user = request.user
        
        # Check if user already has a response (STARTED or COMPLETED)
        try:
            existing_response = QuestionnaireResponse.objects.get(
                user=user,
                questionnaire=instance
            )
            # If already COMPLETED, don't change it
            # If STARTED, keep it as is
        except QuestionnaireResponse.DoesNotExist:
            # No response exists, create a STARTED one
            QuestionnaireResponse.objects.create(
                user=user,
                questionnaire=instance,
                status=QuestionnaireResponse.Status.STARTED
            )
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def get_queryset(self):
        user = self.request.user
        now = timezone.now()
        
        # 1. Base: Published and Started (include expired ones too)
        # We'll filter expired vs active in the frontend
        qs = Questionnaire.objects.filter(
            status=Questionnaire.Status.PUBLISHED,
            start_date__lte=now
        )
        
        # 2. Get questionnaires where user has a response (STARTED or COMPLETED)
        # These should always be included, regardless of targeting
        from .models import QuestionnaireResponse
        user_response_q_ids = QuestionnaireResponse.objects.filter(
            user=user
        ).values_list('questionnaire_id', flat=True)
        has_response_q = Q(id__in=user_response_q_ids)
        
        # 3. Targeting Logic for NEW questionnaires
        
        # A. Group Targeting (Overrides everything else)
        # If the user is a member of the questionnaire's assigned group
        group_ids = user.group_memberships.values_list('group', flat=True)
        group_q = Q(visibility_group__in=group_ids)
        
        # B. Scope Targeting (If no group is set)
        # Global surveys (no muni, no club)
        global_q = Q(municipality__isnull=True, club__isnull=True, visibility_group__isnull=True)
        
        # Municipality Scope
        # If User is Admin -> assigned_municipality
        # If User is Youth -> preferred_club.municipality (Best proxy we have)
        muni_id = None
        if user.role == User.Role.MUNICIPALITY_ADMIN and user.assigned_municipality:
             muni_id = user.assigned_municipality.id
        elif user.role == User.Role.YOUTH_MEMBER and user.preferred_club:
             muni_id = user.preferred_club.municipality.id
             
        muni_q = Q()
        if muni_id:
            muni_q = Q(municipality_id=muni_id, club__isnull=True, visibility_group__isnull=True)

        # Club Scope
        club_id = None
        if user.role == User.Role.CLUB_ADMIN and user.assigned_club:
             club_id = user.assigned_club.id
        elif user.role == User.Role.YOUTH_MEMBER and user.preferred_club:
             club_id = user.preferred_club.id
             
        club_q = Q()
        if club_id:
            club_q = Q(club_id=club_id, visibility_group__isnull=True)
            
        # C. Role Targeting (Youth vs Guardian)
        role_target_q = Q()
        if user.role == User.Role.YOUTH_MEMBER:
            role_target_q = Q(target_audience__in=['YOUTH', 'BOTH'])
        elif user.role == User.Role.GUARDIAN:
             role_target_q = Q(target_audience__in=['GUARDIAN', 'BOTH'])
             
        # Combine B & C: (Scope AND Role)
        scope_and_role = (global_q | muni_q | club_q) & role_target_q
        
        # Final: Include questionnaires where user has a response OR matches targeting
        final_qs = qs.filter(has_response_q | group_q | scope_and_role).distinct()
        
        return final_qs

    @action(detail=True, methods=['post'])
    def save_answers(self, request, pk=None):
        """
        Save partial answers as user progresses through the questionnaire.
        """
        questionnaire = self.get_object()
        user = request.user
        
        # Get or create STARTED response
        response, created = QuestionnaireResponse.objects.get_or_create(
            user=user,
            questionnaire=questionnaire,
            defaults={'status': QuestionnaireResponse.Status.STARTED}
        )
        
        # Don't allow saving answers to completed questionnaires
        if response.status == QuestionnaireResponse.Status.COMPLETED:
            return Response({"error": "Questionnaire already completed."}, status=400)
        
        # Get answers from request
        answers_data = request.data.get('answers', [])
        
        with transaction.atomic():
            # Delete existing answers for this response (we'll recreate them)
            response.answers.all().delete()
            
            # Save new answers
            for ans_data in answers_data:
                try:
                    question = Question.objects.get(id=ans_data.get('question_id'), questionnaire=questionnaire)
                except Question.DoesNotExist:
                    continue
                
                answer = Answer.objects.create(
                    response=response,
                    question=question,
                    text_answer=ans_data.get('text_answer'),
                    rating_answer=ans_data.get('rating_answer')
                )
                
                if ans_data.get('selected_options'):
                    valid_options = QuestionOption.objects.filter(
                        id__in=ans_data['selected_options'],
                        question=question
                    )
                    answer.selected_options.set(valid_options)
        
        return Response({"status": "saved", "saved_answers": len(answers_data)})
    
    @action(detail=False, methods=['post'])
    def submit(self, request):
        """
        Submit a survey response.
        """
        serializer = ResponseSubmissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        user = request.user
        q_id = data['questionnaire_id']
        questionnaire = Questionnaire.objects.get(id=q_id)
        
        # Get or create response (should already exist as STARTED from retrieve)
        response, created = QuestionnaireResponse.objects.get_or_create(
            user=user,
            questionnaire=questionnaire,
            defaults={'status': QuestionnaireResponse.Status.STARTED}
        )
        
        # If already completed, return error
        if response.status == QuestionnaireResponse.Status.COMPLETED:
            return Response({"error": "You have already completed this questionnaire."}, status=400)

        with transaction.atomic():
            # Update response to COMPLETED
            response.status = QuestionnaireResponse.Status.COMPLETED
            response.completed_at = timezone.now()
            response.save()
            
            # 2. Save/Update Answers
            # Delete existing answers and recreate with final submission data
            response.answers.all().delete()
            
            for ans_data in data['answers']:
                # Verify question belongs to questionnaire
                try:
                    question = Question.objects.get(id=ans_data['question_id'], questionnaire=questionnaire)
                except Question.DoesNotExist:
                    continue # Skip invalid questions
                
                answer = Answer.objects.create(
                    response=response,
                    question=question,
                    text_answer=ans_data.get('text_answer'),
                    rating_answer=ans_data.get('rating_answer')
                )
                
                if ans_data.get('selected_options'):
                    # Verify options belong to question
                    valid_options = QuestionOption.objects.filter(
                        id__in=ans_data['selected_options'], 
                        question=question
                    )
                    answer.selected_options.set(valid_options)
            
            # 3. Process Rewards
            reward_message = None
            if questionnaire.rewards.exists():
                # Check limit
                limit = questionnaire.benefit_limit
                # Count *claimed* benefits only
                current_claims = QuestionnaireResponse.objects.filter(
                    questionnaire=questionnaire, is_benefit_claimed=True
                ).count()
                
                if limit is None or current_claims < limit:
                    # Grant rewards
                    response.is_benefit_claimed = True
                    response.save()
                    
                    created_rewards = []
                    for reward in questionnaire.rewards.all():
                        # Create usage record
                        RewardUsage.objects.create(user=user, reward=reward, is_redeemed=False)
                        created_rewards.append(reward.name)
                    
                    if created_rewards:
                        reward_message = f"Congratulations! You earned: {', '.join(created_rewards)}"
            
            # 4. Create activity post for user's timeline
            create_questionnaire_completion_activity_post(response)

        return Response({
            "message": "Survey submitted successfully.", 
            "reward_message": reward_message
        }, status=status.HTTP_201_CREATED)