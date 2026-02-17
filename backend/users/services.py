"""
Data Retention Service for GDPR Compliance.

Handles detection and deletion of inactive user accounts based on 
configurable retention periods at global and municipality levels.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db import transaction
from django.db.models import Max

from .models import User, UserLoginHistory, GuardianYouthLink, IdDocumentUpload

logger = logging.getLogger(__name__)


class InactiveUserService:
    """
    Service to detect and process inactive users for data retention compliance.
    """
    
    # Roles that are subject to automatic deletion
    DELETABLE_ROLES = [
        User.Role.MUNICIPALITY_ADMIN,
        User.Role.CLUB_ADMIN,
        User.Role.YOUTH_MEMBER,
        User.Role.GUARDIAN,
    ]
    
    @staticmethod
    def get_last_activity(user):
        """
        Returns datetime of user's last meaningful activity.
        Checks multiple sources: last_active_at field, login history, check-ins.
        """
        activities = []
        
        # Primary: last_active_at field (updated by signals)
        if user.last_active_at:
            activities.append(user.last_active_at)
        
        # Fallback: Last login from history
        last_login = user.login_history.order_by('-timestamp').values('timestamp').first()
        if last_login:
            activities.append(last_login['timestamp'])
        
        # Fallback: Last check-in
        last_visit = user.visits.order_by('-check_in_at').values('check_in_at').first()
        if last_visit:
            activities.append(last_visit['check_in_at'])
        
        # If no activity recorded, use date_joined
        if not activities:
            return user.date_joined
        
        return max(activities)
    
    @staticmethod
    def get_user_retention_months(user):
        """
        Gets the applicable retention period for a user based on their municipality.
        """
        from licensing.models import GlobalDataRetentionSettings
        
        # For youth members and guardians - check their preferred_club's municipality
        if user.role in [User.Role.YOUTH_MEMBER, User.Role.GUARDIAN]:
            if user.preferred_club and user.preferred_club.municipality:
                return user.preferred_club.municipality.effective_retention_months
        
        # For municipality/club admins
        if user.assigned_municipality:
            return user.assigned_municipality.effective_retention_months
        if user.assigned_club and user.assigned_club.municipality:
            return user.assigned_club.municipality.effective_retention_months
        
        # Fallback to global default
        settings = GlobalDataRetentionSettings.get_settings()
        return settings.default_retention_months
    
    @classmethod
    def get_users_pending_deletion(cls):
        """
        Returns users who haven't been active within their retention period.
        Excludes SUPER_ADMIN.
        """
        users_to_delete = []
        now = timezone.now()
        
        # Only check deletable roles
        queryset = User.objects.filter(
            role__in=cls.DELETABLE_ROLES,
            is_active=True
        ).select_related(
            'preferred_club__municipality',
            'assigned_municipality',
            'assigned_club__municipality'
        )
        
        for user in queryset:
            retention_months = cls.get_user_retention_months(user)
            cutoff_date = now - timedelta(days=retention_months * 30)  # Approximate months
            last_activity = cls.get_last_activity(user)
            
            if last_activity < cutoff_date:
                users_to_delete.append({
                    'user': user,
                    'last_activity': last_activity,
                    'cutoff_date': cutoff_date,
                    'retention_months': retention_months,
                    'days_inactive': (now - last_activity).days
                })
        
        return users_to_delete
    
    @classmethod
    def get_users_needing_warning(cls, warning_days):
        """
        Returns users who are approaching deletion and need a warning notification.
        
        Args:
            warning_days: Number of days before deletion to warn (e.g., 30)
        """
        users_to_warn = []
        now = timezone.now()
        
        queryset = User.objects.filter(
            role__in=cls.DELETABLE_ROLES,
            is_active=True,
            deletion_warning_sent_at__isnull=True  # Haven't been warned yet
        ).select_related(
            'preferred_club__municipality',
            'assigned_municipality',
            'assigned_club__municipality'
        )
        
        for user in queryset:
            retention_months = cls.get_user_retention_months(user)
            deletion_date = cls.get_last_activity(user) + timedelta(days=retention_months * 30)
            warning_date = deletion_date - timedelta(days=warning_days)
            
            if now >= warning_date and now < deletion_date:
                users_to_warn.append({
                    'user': user,
                    'deletion_date': deletion_date,
                    'days_until_deletion': (deletion_date - now).days
                })
        
        return users_to_warn
    
    @classmethod
    def get_users_needing_final_warning(cls, warning_days):
        """
        Returns users who need a final warning before deletion.
        Only includes users who have already received the first warning.
        """
        users_to_warn = []
        now = timezone.now()
        
        queryset = User.objects.filter(
            role__in=cls.DELETABLE_ROLES,
            is_active=True,
            deletion_warning_sent_at__isnull=False,  # First warning sent
            deletion_final_warning_sent_at__isnull=True  # Final warning not sent
        ).select_related(
            'preferred_club__municipality',
            'assigned_municipality',
            'assigned_club__municipality'
        )
        
        for user in queryset:
            retention_months = cls.get_user_retention_months(user)
            deletion_date = cls.get_last_activity(user) + timedelta(days=retention_months * 30)
            final_warning_date = deletion_date - timedelta(days=warning_days)
            
            if now >= final_warning_date and now < deletion_date:
                users_to_warn.append({
                    'user': user,
                    'deletion_date': deletion_date,
                    'days_until_deletion': (deletion_date - now).days
                })
        
        return users_to_warn
    
    @classmethod
    @transaction.atomic
    def anonymize_user(cls, user, reason="Inactive account deletion"):
        """
        Anonymizes a user's personal data while preserving analytics.
        
        This performs a "soft delete" by:
        1. Removing personal identifying information
        2. Keeping aggregated/anonymous analytics data
        3. Marking the account as inactive
        4. Logging the action
        """
        from visits.models import VisitStats
        
        logger.info(f"Anonymizing user {user.id} ({user.email}) - Reason: {reason}")
        
        original_email = user.email
        anonymized_email = f"deleted_{user.id}@anonymized.local"
        
        # --- STEP 1: Aggregate visit data before deletion ---
        # VisitStats should already be aggregated, but ensure it's up to date
        # (This would be handled by a separate aggregation task in production)
        
        # --- STEP 2: Delete personal files ---
        if user.avatar:
            user.avatar.delete(save=False)
        if user.background_image:
            user.background_image.delete(save=False)
        if user.id_document:
            user.id_document.delete(save=False)
        
        # Delete ID document uploads
        for doc in IdDocumentUpload.objects.filter(guardian=user):
            if doc.document:
                doc.document.delete(save=False)
            doc.delete()
        
        # --- STEP 3: Anonymize user fields ---
        user.email = anonymized_email
        user.first_name = "Deleted"
        user.last_name = "User"
        user.phone_number = None
        user.nickname = ""
        user.mood_status = ""
        user.date_of_birth = None
        user.legal_gender = ""
        user.preferred_gender = ""
        user.profession = ""
        user.is_active = False
        user.set_unusable_password()
        
        # Clear verification data
        user.verification_status = User.VerificationStatus.UNVERIFIED
        user.id_document_type = ""
        user.id_document_review_status = User.IdDocumentReviewStatus.NOT_SUBMITTED
        user.id_document_rejection_reason = ""
        
        user.save()
        
        # --- STEP 4: Delete related personal data ---
        
        # Delete login history (but we've already used it for last_active_at)
        UserLoginHistory.objects.filter(user=user).delete()
        
        # Delete guardian links
        GuardianYouthLink.objects.filter(guardian=user).delete()
        GuardianYouthLink.objects.filter(youth=user).delete()
        
        # Delete individual visit sessions (aggregated data in VisitStats is kept)
        user.visits.all().delete()
        
        # Handle messenger conversations (anonymize, don't delete)
        cls._anonymize_messenger_data(user)
        
        # Handle posts and comments (anonymize, don't delete)
        cls._anonymize_posts_data(user)
        
        # Handle notifications
        user.notifications.all().delete()
        
        # Handle group memberships
        if hasattr(user, 'group_memberships'):
            user.group_memberships.all().delete()
        
        logger.info(f"User {user.id} anonymized successfully. Original email: {original_email}")
        
        return {
            'user_id': user.id,
            'original_email': original_email,
            'anonymized': True
        }
    
    @staticmethod
    def _anonymize_messenger_data(user):
        """Anonymize user's messenger data."""
        try:
            from messenger.models import Message, ConversationUserStatus, MessageRecipient, MessageReaction
            
            # Delete messages sent by this user
            # (CASCADE will delete related attachments, reactions, recipient statuses)
            Message.objects.filter(sender=user).delete()
            
            # Delete message reactions by this user
            MessageReaction.objects.filter(user=user).delete()
            
            # Delete recipient statuses for this user
            MessageRecipient.objects.filter(recipient=user).delete()
            
            # Remove user from conversation statuses
            ConversationUserStatus.objects.filter(user=user).delete()
            
            # Remove user from conversation participants
            from messenger.models import Conversation
            for conv in Conversation.objects.filter(participants=user):
                conv.participants.remove(user)
            
        except ImportError:
            logger.warning("Messenger app not available for anonymization")
    
    @staticmethod
    def _anonymize_posts_data(user):
        """Anonymize user's posts and comments."""
        try:
            from posts.models import Post, PostComment, PostReaction
            
            # Anonymize posts (keep content, remove author reference)
            # Post.author allows NULL, so we can set it to None
            Post.objects.filter(author=user).update(author=None)
            
            # Delete comments by this user (CASCADE constraint prevents NULL)
            PostComment.objects.filter(author=user).delete()
            
            # Delete reactions by this user
            PostReaction.objects.filter(user=user).delete()
            
        except ImportError:
            logger.warning("Posts app not available for anonymization")
    
    @classmethod
    def send_deletion_warning(cls, user, days_until_deletion, deletion_date, is_final=False):
        """
        Send a deletion warning email to the user.
        
        Args:
            user: The user to warn
            days_until_deletion: Number of days until account will be deleted
            deletion_date: The exact deletion date
            is_final: Whether this is the final warning (7 days) or first warning (30 days)
        
        Returns:
            bool: True if email was sent successfully
        """
        from emails.models import EmailTemplate
        from emails.tasks import send_email_async
        
        template_type = (
            EmailTemplate.Type.DELETION_WARNING_FINAL if is_final 
            else EmailTemplate.Type.DELETION_WARNING_FIRST
        )
        
        context = {
            'days_left': days_until_deletion,
            'deletion_date': deletion_date.strftime('%Y-%m-%d'),
        }
        
        success = send_email_async(
            template_type=template_type,
            recipient=user,
            context=context
        )
        
        if success:
            cls.mark_warning_sent(user, is_final=is_final)
            logger.info(f"{'Final' if is_final else 'First'} warning sent to {user.email}")
        else:
            logger.error(f"Failed to send {'final' if is_final else 'first'} warning to {user.email}")
        
        return success
    
    @classmethod
    def send_account_deleted_notification(cls, email, user_name="User"):
        """
        Send a confirmation email after account has been deleted.
        Note: This is sent to the email before it was anonymized.
        
        Args:
            email: The original email address before anonymization
            user_name: The user's name (first name or full name) before deletion
        """
        from emails.models import EmailTemplate
        from django.core.mail import EmailMultiAlternatives
        from django.conf import settings
        from django.template import Template, Context
        
        # Since the user is already anonymized, we can't use send_email_async()
        # But we can still use the template if it exists
        try:
            template = EmailTemplate.objects.get(type=EmailTemplate.Type.ACCOUNT_DELETED)
            translation = template.get_translation('sv')  # Default to Swedish
            
            if translation:
                # Build minimal context
                context = Context({
                    'user': {'first_name': user_name, 'full_name': user_name},
                    'app_name': 'Ungdomsappen',
                    'support_email': 'support@ungdomsappen.se',
                })
                
                subject_template = Template(translation.subject)
                body_template = Template(translation.body_html)
                
                subject = subject_template.render(context)
                body_html = body_template.render(context)
                body_text = translation.body_text or "Your account has been deleted according to GDPR policies."
                
                email_message = EmailMultiAlternatives(
                    subject=subject,
                    body=body_text,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[email],
                )
                email_message.attach_alternative(body_html, "text/html")
                email_message.send(fail_silently=True)
            else:
                # Fallback to simple email if template not found
                from django.core.mail import send_mail
                send_mail(
                    subject='Your account has been deleted',
                    message='Your account on Ungdomsappen has been deleted according to our data protection policies (GDPR). All personal data has been permanently removed.',
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=True,
                )
            
            logger.info(f"Account deleted notification sent to {email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send account deleted notification to {email}: {e}")
            return False
    
    @classmethod
    def mark_warning_sent(cls, user, is_final=False):
        """Mark that a deletion warning was sent to the user."""
        if is_final:
            user.deletion_final_warning_sent_at = timezone.now()
        else:
            user.deletion_warning_sent_at = timezone.now()
        user.save(update_fields=[
            'deletion_final_warning_sent_at' if is_final else 'deletion_warning_sent_at'
        ])
    
    @classmethod
    def reset_deletion_warnings(cls, user):
        """Reset deletion warnings when user becomes active again."""
        user.deletion_warning_sent_at = None
        user.deletion_final_warning_sent_at = None
        user.save(update_fields=['deletion_warning_sent_at', 'deletion_final_warning_sent_at'])
    
    @classmethod
    def get_retention_statistics(cls):
        """
        Returns statistics about user retention status for admin dashboard.
        """
        from licensing.models import GlobalDataRetentionSettings
        
        settings = GlobalDataRetentionSettings.get_settings()
        now = timezone.now()
        
        total_users = User.objects.filter(role__in=cls.DELETABLE_ROLES, is_active=True).count()
        
        # Count users by activity status
        active_30_days = 0
        active_90_days = 0
        inactive_users = 0
        pending_deletion = 0
        
        for user in User.objects.filter(role__in=cls.DELETABLE_ROLES, is_active=True):
            last_activity = cls.get_last_activity(user)
            days_since_activity = (now - last_activity).days
            retention_months = cls.get_user_retention_months(user)
            retention_days = retention_months * 30
            
            if days_since_activity <= 30:
                active_30_days += 1
            elif days_since_activity <= 90:
                active_90_days += 1
            else:
                inactive_users += 1
            
            if days_since_activity >= retention_days:
                pending_deletion += 1
        
        return {
            'total_deletable_users': total_users,
            'active_last_30_days': active_30_days,
            'active_last_90_days': active_90_days,
            'inactive_over_90_days': inactive_users,
            'pending_deletion': pending_deletion,
            'global_retention_months': settings.default_retention_months,
            'auto_deletion_enabled': settings.is_auto_deletion_enabled
        }

