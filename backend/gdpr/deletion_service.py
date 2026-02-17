"""
Service for processing account deletion requests.

Implements GDPR Article 17: Right to erasure ('right to be forgotten').
"""

import hashlib
import logging
import time
from datetime import timedelta
from typing import Dict, List

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from emails.services import EmailService
from .deletion_models import (
    AccountDeletionRequest,
    DeletionLog,
    DeletedUserRecord
)

User = get_user_model()
logger = logging.getLogger(__name__)


class AccountDeletionService:
    """
    Service for handling account deletion requests.
    
    Implements two deletion strategies:
    1. Full deletion - Completely removes all user data
    2. Anonymization - Replaces identifying data with anonymous values
    """
    
    @staticmethod
    def _log_deletion(
        deletion_request: AccountDeletionRequest,
        level: str,
        action: str,
        model_name: str = '',
        count: int = None,
        details: dict = None
    ):
        """Helper to log deletion process steps"""
        DeletionLog.objects.create(
            deletion_request=deletion_request,
            level=level,
            action=action,
            model_name=model_name,
            count=count,
            details=details
        )
        
        log_func = getattr(logger, level.lower(), logger.info)
        log_func(f"[Deletion-{deletion_request.id}] {action} ({model_name}): {count} records")
    
    @staticmethod
    def request_deletion(
        user: User,
        reason: str = '',
        deletion_type: str = 'anonymize',
        ip_address: str = None,
        user_agent: str = ''
    ) -> AccountDeletionRequest:
        """
        Create an account deletion request.
        
        Args:
            user: User requesting deletion
            reason: Optional reason for deletion
            deletion_type: 'full' or 'anonymize'
            ip_address: IP address of request
            user_agent: Browser user agent
        
        Returns:
            AccountDeletionRequest instance
        """
        # Check if user already has pending deletion request
        existing = AccountDeletionRequest.objects.filter(
            user=user,
            status=AccountDeletionRequest.Status.PENDING
        ).first()
        
        if existing:
            logger.warning(f"User {user.id} already has pending deletion request")
            return existing
        
        # Get grace period from settings
        grace_period_days = getattr(settings, 'GDPR_ACCOUNT_DELETION_GRACE_PERIOD_DAYS', 30)
        
        # Create deletion request
        deletion_request = AccountDeletionRequest.objects.create(
            user=user,
            reason=reason,
            deletion_type=deletion_type,
            grace_period_days=grace_period_days,
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else ''
        )
        
        # Log audit event
        try:
            from audit.services import log_audit_event
            log_audit_event(
                action="ACCOUNT_DELETION_REQUESTED",
                user=user,
                model_name="AccountDeletionRequest",
                object_id=deletion_request.id,
                object_repr=f"Deletion request for {user.email}",
                ip_address=ip_address,
                user_agent=user_agent,
                changes={
                    'scheduled_deletion_date': deletion_request.scheduled_deletion_date.isoformat(),
                    'grace_period_days': grace_period_days
                }
            )
        except:
            pass
        
        # Send confirmation email
        AccountDeletionService.send_deletion_requested_email(deletion_request)
        
        logger.info(
            f"Deletion request created for user {user.id}. "
            f"Scheduled for {deletion_request.scheduled_deletion_date}"
        )
        
        return deletion_request
    
    @staticmethod
    def cancel_deletion(
        deletion_request: AccountDeletionRequest,
        reason: str = ''
    ) -> bool:
        """
        Cancel a pending deletion request.
        
        Args:
            deletion_request: Request to cancel
            reason: Reason for cancellation
        
        Returns:
            True if cancelled successfully
        """
        try:
            deletion_request.cancel(reason=reason)
            
            # Log audit event
            try:
                from audit.services import log_audit_event
                log_audit_event(
                    action="ACCOUNT_DELETION_CANCELLED",
                    user=deletion_request.user,
                    model_name="AccountDeletionRequest",
                    object_id=deletion_request.id,
                    object_repr=f"Deletion request for {deletion_request.user.email}",
                    changes={'cancellation_reason': reason}
                )
            except:
                pass
            
            # Send confirmation email
            AccountDeletionService.send_deletion_cancelled_email(deletion_request)
            
            logger.info(f"Deletion request {deletion_request.id} cancelled")
            return True
            
        except Exception as e:
            logger.error(f"Failed to cancel deletion request: {e}")
            return False
    
    @staticmethod
    def anonymize_user(user: User, deletion_request: AccountDeletionRequest):
        """
        Anonymize user data instead of complete deletion.
        
        This keeps statistical data intact while removing personal identifiers.
        """
        AccountDeletionService._log_deletion(
            deletion_request, 'INFO', 'Starting anonymization', 'User'
        )
        
        # Generate anonymous identifiers
        anonymous_id = f"anonymous_{user.id}"
        
        # Store original data for audit
        original_email = user.email
        original_first_name = user.first_name
        original_last_name = user.last_name
        
        # Anonymize user profile
        user.email = f"{anonymous_id}@deleted.local"
        user.first_name = "Deleted"
        user.last_name = "User"
        user.phone_number = ""
        user.address = ""
        user.zip_code = ""
        user.city = ""
        user.country = ""
        user.date_of_birth = None
        user.is_active = False
        
        # Clear sensitive fields
        if hasattr(user, 'avatar'):
            user.avatar = None
        if hasattr(user, 'background_image'):
            user.background_image = None
        
        user.save()
        
        AccountDeletionService._log_deletion(
            deletion_request, 'SUCCESS', 'Anonymized user profile', 'User', 1,
            {'original_email': original_email}
        )
        
        # Anonymize related data
        counts = {}
        
        # Posts - Keep for community but anonymize author
        try:
            from posts.models import Post, Comment
            posts_count = Post.objects.filter(author=user).update(
                author_id=None,  # Or use a system "deleted user" account
            )
            comments_count = Comment.objects.filter(author=user).update(
                author_id=None
            )
            counts['posts'] = posts_count
            counts['comments'] = comments_count
            
            AccountDeletionService._log_deletion(
                deletion_request, 'INFO', 'Anonymized posts and comments',
                'Post', posts_count + comments_count
            )
        except Exception as e:
            logger.error(f"Error anonymizing posts: {e}")
        
        # Messages - Delete sent messages, keep received for other users
        try:
            from messenger.models import Message
            deleted_messages = Message.objects.filter(sender=user).delete()
            counts['messages'] = deleted_messages[0] if deleted_messages else 0
            
            AccountDeletionService._log_deletion(
                deletion_request, 'INFO', 'Deleted sent messages',
                'Message', counts['messages']
            )
        except Exception as e:
            logger.error(f"Error deleting messages: {e}")
        
        return counts
    
    @staticmethod
    def full_delete_user(user: User, deletion_request: AccountDeletionRequest):
        """
        Completely delete all user data.
        
        WARNING: This is irreversible!
        """
        AccountDeletionService._log_deletion(
            deletion_request, 'INFO', 'Starting full deletion', 'User'
        )
        
        counts = {}
        user_id = user.id
        
        # Delete in reverse order of foreign key dependencies
        
        # 1. User-created content
        models_to_delete = [
            ('posts.models', 'Post', 'author'),
            ('posts.models', 'Comment', 'author'),
            ('posts.models', 'PostReaction', 'user'),
            ('events.models', 'EventRegistration', 'user'),
            ('messenger.models', 'Message', 'sender'),
            ('messenger.models', 'MessageRecipient', 'user'),
            ('notifications.models', 'Notification', 'recipient'),
            ('visits.models', 'Visit', 'user'),
            ('rewards.models', 'RewardUsage', 'user'),
            ('questionnaires.models', 'QuestionnaireResponse', 'user'),
            ('bookings.models', 'Booking', 'user'),
            ('inventory.models', 'ItemBorrowing', 'user'),
            ('groups.models', 'GroupMembership', 'user'),
        ]
        
        for module_path, model_name, field_name in models_to_delete:
            try:
                module = __import__(module_path, fromlist=[model_name])
                model = getattr(module, model_name)
                deleted = model.objects.filter(**{field_name: user}).delete()
                count = deleted[0] if deleted else 0
                counts[model_name] = count
                
                if count > 0:
                    AccountDeletionService._log_deletion(
                        deletion_request, 'INFO', f'Deleted {model_name}',
                        model_name, count
                    )
            except Exception as e:
                logger.error(f"Error deleting {model_name}: {e}")
                AccountDeletionService._log_deletion(
                    deletion_request, 'ERROR', f'Failed to delete {model_name}',
                    model_name, 0, {'error': str(e)}
                )
        
        # 2. Delete user account
        user.delete()
        counts['User'] = 1
        
        AccountDeletionService._log_deletion(
            deletion_request, 'SUCCESS', 'Deleted user account', 'User', 1,
            {'user_id': user_id}
        )
        
        return counts
    
    @staticmethod
    def process_deletion(deletion_request: AccountDeletionRequest):
        """
        Process a deletion request.
        
        This is called by the scheduled job when grace period expires.
        """
        if deletion_request.status != AccountDeletionRequest.Status.PENDING:
            logger.warning(f"Deletion request {deletion_request.id} is not pending")
            return
        
        if not deletion_request.is_due:
            logger.warning(f"Deletion request {deletion_request.id} is not yet due")
            return
        
        user = deletion_request.user
        start_time = time.monotonic()
        
        try:
            deletion_request.mark_as_processing()
            
            AccountDeletionService._log_deletion(
                deletion_request, 'INFO', 'Starting deletion process', 'AccountDeletionRequest'
            )
            
            # Send final notification
            AccountDeletionService.send_deletion_processing_email(deletion_request)
            
            # Create deleted user record
            email_hash = hashlib.sha256(user.email.encode()).hexdigest()
            
            deleted_record = DeletedUserRecord.objects.create(
                original_user_id=user.id,
                email_hash=email_hash,
                deletion_reason=deletion_request.reason,
                deletion_type=deletion_request.deletion_type,
                registration_date=user.date_joined,
                last_login_date=user.last_login
            )
            
            # Perform deletion based on type
            if deletion_request.deletion_type == AccountDeletionRequest.DeletionType.FULL:
                counts = AccountDeletionService.full_delete_user(user, deletion_request)
            else:
                counts = AccountDeletionService.anonymize_user(user, deletion_request)
            
            # Calculate processing time
            end_time = time.monotonic()
            processing_time = int(end_time - start_time)
            
            # Mark as completed
            deletion_request.mark_as_completed(processing_time)
            
            AccountDeletionService._log_deletion(
                deletion_request, 'SUCCESS', 'Deletion completed',
                'AccountDeletionRequest', None,
                {'processing_time_seconds': processing_time, 'counts': counts}
            )
            
            logger.info(
                f"Successfully processed deletion request {deletion_request.id} "
                f"in {processing_time} seconds"
            )
            
        except Exception as e:
            error_message = f"Deletion failed: {e}"
            logger.exception(error_message)
            
            deletion_request.mark_as_failed(error_message)
            
            AccountDeletionService._log_deletion(
                deletion_request, 'ERROR', 'Deletion failed',
                'AccountDeletionRequest', None, {'error': str(e)}
            )
            
            # Try to notify user (if they still exist)
            try:
                AccountDeletionService.send_deletion_failed_email(deletion_request)
            except:
                pass
    
    @staticmethod
    def send_deletion_requested_email(deletion_request: AccountDeletionRequest):
        """Send email confirming deletion was requested"""
        user = deletion_request.user
        
        if not user.email:
            return
        
        context = {
            'user_first_name': user.first_name or user.email,
            'scheduled_date': deletion_request.scheduled_deletion_date.strftime('%Y-%m-%d'),
            'days_remaining': deletion_request.days_until_deletion,
            'cancel_url': f"{settings.FRONTEND_URL}/account/cancel-deletion",
            'app_name': getattr(settings, 'APP_NAME', 'Ungdomsappen'),
        }
        
        EmailService.send(
            template_type='account_deletion_requested',
            recipient_email=user.email,
            context=context,
            user=user
        )
    
    @staticmethod
    def send_deletion_reminder_email(deletion_request: AccountDeletionRequest):
        """Send reminder email before deletion"""
        user = deletion_request.user
        
        if not user.email:
            return
        
        context = {
            'user_first_name': user.first_name or user.email,
            'scheduled_date': deletion_request.scheduled_deletion_date.strftime('%Y-%m-%d'),
            'days_remaining': deletion_request.days_until_deletion,
            'cancel_url': f"{settings.FRONTEND_URL}/account/cancel-deletion",
            'app_name': getattr(settings, 'APP_NAME', 'Ungdomsappen'),
        }
        
        EmailService.send(
            template_type='account_deletion_reminder',
            recipient_email=user.email,
            context=context,
            user=user
        )
        
        deletion_request.reminder_sent_at = timezone.now()
        deletion_request.save(update_fields=['reminder_sent_at'])
    
    @staticmethod
    def send_deletion_final_warning_email(deletion_request: AccountDeletionRequest):
        """Send final warning before deletion"""
        user = deletion_request.user
        
        if not user.email:
            return
        
        context = {
            'user_first_name': user.first_name or user.email,
            'scheduled_date': deletion_request.scheduled_deletion_date.strftime('%Y-%m-%d'),
            'hours_remaining': max(1, deletion_request.days_until_deletion * 24),
            'cancel_url': f"{settings.FRONTEND_URL}/account/cancel-deletion",
            'app_name': getattr(settings, 'APP_NAME', 'Ungdomsappen'),
        }
        
        EmailService.send(
            template_type='account_deletion_final_warning',
            recipient_email=user.email,
            context=context,
            user=user
        )
        
        deletion_request.final_warning_sent_at = timezone.now()
        deletion_request.save(update_fields=['final_warning_sent_at'])
    
    @staticmethod
    def send_deletion_processing_email(deletion_request: AccountDeletionRequest):
        """Send email when deletion is being processed"""
        user = deletion_request.user
        
        if not user.email:
            return
        
        context = {
            'user_first_name': user.first_name or user.email,
            'app_name': getattr(settings, 'APP_NAME', 'Ungdomsappen'),
        }
        
        EmailService.send(
            template_type='account_deletion_processing',
            recipient_email=user.email,
            context=context,
            user=user
        )
    
    @staticmethod
    def send_deletion_cancelled_email(deletion_request: AccountDeletionRequest):
        """Send email confirming deletion was cancelled"""
        user = deletion_request.user
        
        if not user.email:
            return
        
        context = {
            'user_first_name': user.first_name or user.email,
            'app_name': getattr(settings, 'APP_NAME', 'Ungdomsappen'),
        }
        
        EmailService.send(
            template_type='account_deletion_cancelled',
            recipient_email=user.email,
            context=context,
            user=user
        )
    
    @staticmethod
    def send_deletion_failed_email(deletion_request: AccountDeletionRequest):
        """Send email if deletion failed"""
        user = deletion_request.user
        
        if not user.email:
            return
        
        context = {
            'user_first_name': user.first_name or user.email,
            'error_message': deletion_request.error_message,
            'app_name': getattr(settings, 'APP_NAME', 'Ungdomsappen'),
        }
        
        EmailService.send(
            template_type='account_deletion_failed',
            recipient_email=user.email,
            context=context,
            user=user
        )
    
    @staticmethod
    def process_due_deletions():
        """
        Process all deletion requests that are due.
        
        Called by scheduled job.
        """
        due_requests = AccountDeletionRequest.objects.filter(
            status=AccountDeletionRequest.Status.PENDING,
            scheduled_deletion_date__lte=timezone.now()
        )
        
        logger.info(f"Found {due_requests.count()} deletion requests due for processing")
        
        for deletion_request in due_requests:
            try:
                AccountDeletionService.process_deletion(deletion_request)
            except Exception as e:
                logger.error(f"Error processing deletion {deletion_request.id}: {e}")
    
    @staticmethod
    def send_deletion_reminders():
        """
        Send reminder emails for upcoming deletions.
        
        Called by scheduled job.
        """
        # Send reminder 7 days before deletion
        reminder_date = timezone.now() + timedelta(days=7)
        
        pending_requests = AccountDeletionRequest.objects.filter(
            status=AccountDeletionRequest.Status.PENDING,
            scheduled_deletion_date__date=reminder_date.date(),
            reminder_sent_at__isnull=True
        )
        
        for deletion_request in pending_requests:
            try:
                AccountDeletionService.send_deletion_reminder_email(deletion_request)
                logger.info(f"Sent deletion reminder for request {deletion_request.id}")
            except Exception as e:
                logger.error(f"Error sending deletion reminder: {e}")
        
        # Send final warning 24 hours before deletion
        warning_date = timezone.now() + timedelta(hours=24)
        
        final_warnings = AccountDeletionRequest.objects.filter(
            status=AccountDeletionRequest.Status.PENDING,
            scheduled_deletion_date__lte=warning_date,
            scheduled_deletion_date__gt=timezone.now(),
            final_warning_sent_at__isnull=True
        )
        
        for deletion_request in final_warnings:
            try:
                AccountDeletionService.send_deletion_final_warning_email(deletion_request)
                logger.info(f"Sent final warning for request {deletion_request.id}")
            except Exception as e:
                logger.error(f"Error sending final warning: {e}")

