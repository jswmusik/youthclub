from django.db.models.signals import post_save, pre_save, pre_delete
from django.dispatch import receiver
from django.db.models import Q
from django.utils import timezone
from .models import Questionnaire
from users.models import User
from notifications.models import Notification


@receiver(pre_save, sender=Questionnaire)
def capture_questionnaire_previous_state(sender, instance, **kwargs):
    """
    Capture the previous state of the questionnaire to detect when it becomes available.
    """
    if instance.pk:
        try:
            old_instance = Questionnaire.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
            instance._old_start_date = old_instance.start_date
        except Questionnaire.DoesNotExist:
            instance._old_status = None
            instance._old_start_date = None
    else:
        instance._old_status = None
        instance._old_start_date = None


@receiver(post_save, sender=Questionnaire)
def notify_questionnaire_availability(sender, instance, created, **kwargs):
    """
    Send notifications to eligible users when a questionnaire becomes available.
    
    Triggers when:
    1. A questionnaire is published and start_date is set (becomes available)
    2. A questionnaire's start_date changes from None/null to a date (scheduled publish)
    """
    questionnaire = instance
    
    # Only notify if questionnaire is PUBLISHED
    if questionnaire.status != Questionnaire.Status.PUBLISHED:
        return
    
    # Only notify if start_date is set (questionnaire is now available)
    if not questionnaire.start_date:
        return
    
    # Only notify if questionnaire hasn't expired yet
    now = timezone.now()
    if questionnaire.expiration_date and questionnaire.expiration_date < now:
        return
    
    # Check if this is a new availability (either newly created with start_date, or start_date was just set)
    should_notify = False
    
    if created:
        # New questionnaire published immediately
        should_notify = True
    else:
        # Check if start_date was just set (was None/null, now has a value)
        old_start_date = getattr(instance, '_old_start_date', None)
        if old_start_date is None and questionnaire.start_date is not None:
            should_notify = True
    
    if not should_notify:
        return
    
    # Avoid duplicate notifications - check if notifications already exist for this questionnaire
    if Notification.objects.filter(
        category=Notification.Category.SYSTEM,
        action_url__icontains=f"/dashboard/youth/questionnaires/{questionnaire.id}"
    ).exists():
        return
    
    # Find eligible users using the same logic as UserQuestionnaireViewSet
    # Base: Active users (Youth Members and Guardians)
    candidates = User.objects.filter(
        role__in=[User.Role.YOUTH_MEMBER, User.Role.GUARDIAN],
        is_active=True
    )
    
    # Build targeting query
    query_filter = Q()
    
    # A. Group Targeting (Overrides everything else)
    # Find users who are members of the questionnaire's assigned group
    if questionnaire.visibility_group:
        group_member_ids = questionnaire.visibility_group.memberships.filter(
            status='APPROVED'
        ).values_list('user_id', flat=True)
        query_filter = Q(id__in=group_member_ids)
    else:
        # B. Scope Targeting (If no group is set)
        # Global surveys (no muni, no club)
        global_q = Q()
        if not questionnaire.municipality and not questionnaire.club:
            global_q = Q()  # All users
        
        # Municipality Scope
        muni_q = Q()
        if questionnaire.municipality and not questionnaire.club:
            # Users whose preferred_club is in this municipality
            muni_q = Q(preferred_club__municipality=questionnaire.municipality)
        
        # Club Scope
        club_q = Q()
        if questionnaire.club:
            club_q = Q(preferred_club=questionnaire.club)
        
        # C. Role Targeting (Youth vs Guardian)
        role_q = Q()
        if questionnaire.target_audience == Questionnaire.TargetAudience.YOUTH:
            role_q = Q(role=User.Role.YOUTH_MEMBER)
        elif questionnaire.target_audience == Questionnaire.TargetAudience.GUARDIAN:
            role_q = Q(role=User.Role.GUARDIAN)
        elif questionnaire.target_audience == Questionnaire.TargetAudience.BOTH:
            role_q = Q(role__in=[User.Role.YOUTH_MEMBER, User.Role.GUARDIAN])
        
        # Combine: (Global OR Municipality OR Club) AND Role
        scope_q = global_q | muni_q | club_q
        query_filter = scope_q & role_q
    
    # Apply filter to candidates
    eligible_users = candidates.filter(query_filter).distinct()
    
    # Exclude users who have already completed this questionnaire
    from .models import QuestionnaireResponse
    completed_user_ids = questionnaire.responses.filter(
        status=QuestionnaireResponse.Status.COMPLETED
    ).values_list('user_id', flat=True)
    eligible_users = eligible_users.exclude(id__in=completed_user_ids)
    
    # Create notifications
    notifications_to_create = []
    for user in eligible_users:
        # Build notification message
        reward_text = ""
        if questionnaire.rewards.exists():
            reward_names = [r.name for r in questionnaire.rewards.all()[:3]]
            if len(reward_names) == 1:
                reward_text = f" Complete it to earn: {reward_names[0]}!"
            elif len(reward_names) > 1:
                reward_text = f" Complete it to earn rewards!"
        
        notifications_to_create.append(
            Notification(
                recipient=user,
                category=Notification.Category.SYSTEM,
                title=f"New Questionnaire: {questionnaire.title}",
                body=f"{questionnaire.description[:100] if questionnaire.description else 'Share your opinion!'}{reward_text}",
                action_url=f"/dashboard/youth/questionnaires/{questionnaire.id}"
            )
        )
    
    # Bulk create notifications
    if notifications_to_create:
        Notification.objects.bulk_create(notifications_to_create)


@receiver(pre_delete, sender=Questionnaire)
def cleanup_questionnaire_notifications(sender, instance, **kwargs):
    """
    Delete all notifications related to this questionnaire when it is deleted.
    This prevents users from clicking on notifications that point to deleted questionnaires.
    """
    questionnaire = instance
    
    # Delete notifications that reference this questionnaire
    Notification.objects.filter(
        category=Notification.Category.SYSTEM,
        action_url__icontains=f"/dashboard/youth/questionnaires/{questionnaire.id}"
    ).delete()

