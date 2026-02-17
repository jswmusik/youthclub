"""
Service functions for GDPR data export.

Collects all user data from various models for export.
"""

import logging
from typing import Dict, Any, List
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()
logger = logging.getLogger(__name__)


class DataExportService:
    """
    Service for collecting and exporting user data.
    
    Collects data from all relevant models and formats it
    for export in compliance with GDPR Article 15 & 20.
    """
    
    def __init__(self, user: User):
        self.user = user
        self.data = {}
        self.sections_collected = []
        self.sections_failed = []
    
    def collect_all_data(self) -> Dict[str, Any]:
        """
        Collect all user data from all models.
        
        Returns a dictionary with all user data organized by section.
        """
        logger.info(f"Starting data collection for user {self.user.id}")
        
        # Metadata
        self.data['export_metadata'] = {
            'user_id': self.user.id,
            'export_date': timezone.now().isoformat(),
            'format': 'JSON',
            'gdpr_articles': ['Article 15 - Right of Access', 'Article 20 - Data Portability']
        }
        
        # Collect each section
        self._collect_profile_data()
        self._collect_visits_data()
        self._collect_posts_data()
        self._collect_events_data()
        self._collect_messages_data()
        self._collect_notifications_data()
        self._collect_rewards_data()
        self._collect_questionnaires_data()
        self._collect_bookings_data()
        self._collect_inventory_data()
        self._collect_groups_data()
        self._collect_audit_logs()
        
        # Summary
        self.data['export_summary'] = {
            'sections_collected': len(self.sections_collected),
            'sections_failed': len(self.sections_failed),
            'collected_sections': self.sections_collected,
            'failed_sections': self.sections_failed,
        }
        
        logger.info(f"Data collection complete for user {self.user.id}. "
                   f"Collected: {len(self.sections_collected)}, Failed: {len(self.sections_failed)}")
        
        return self.data
    
    def _collect_profile_data(self):
        """Collect user profile information"""
        try:
            self.data['profile'] = {
                'email': self.user.email,
                'first_name': self.user.first_name,
                'last_name': self.user.last_name,
                'date_of_birth': str(self.user.date_of_birth) if hasattr(self.user, 'date_of_birth') and self.user.date_of_birth else None,
                'gender': self.user.gender if hasattr(self.user, 'gender') else None,
                'phone_number': self.user.phone_number if hasattr(self.user, 'phone_number') else None,
                'address': self.user.address if hasattr(self.user, 'address') else None,
                'postal_code': self.user.postal_code if hasattr(self.user, 'postal_code') else None,
                'city': self.user.city if hasattr(self.user, 'city') else None,
                'grade': self.user.grade if hasattr(self.user, 'grade') else None,
                'role': self.user.role if hasattr(self.user, 'role') else None,
                'preferred_language': self.user.preferred_language if hasattr(self.user, 'preferred_language') else None,
                'date_joined': self.user.date_joined.isoformat() if hasattr(self.user, 'date_joined') else None,
                'last_login': self.user.last_login.isoformat() if self.user.last_login else None,
                'preferred_youth_club_id': self.user.preferred_youth_club_id if hasattr(self.user, 'preferred_youth_club_id') else None,
                'mood_status': self.user.mood_status if hasattr(self.user, 'mood_status') else None,
            }
            
            # Interests
            if hasattr(self.user, 'interests'):
                self.data['profile']['interests'] = [
                    {'id': interest.id, 'name': interest.name}
                    for interest in self.user.interests.all()
                ]
            
            # Followed clubs
            if hasattr(self.user, 'followed_clubs'):
                self.data['profile']['followed_clubs'] = [
                    {'id': club.id, 'name': club.name}
                    for club in self.user.followed_clubs.all()
                ]
            
            self.sections_collected.append('profile')
        except Exception as e:
            logger.error(f"Failed to collect profile data: {e}")
            self.sections_failed.append(f'profile: {str(e)}')
            self.data['profile'] = {'error': str(e)}
    
    def _collect_visits_data(self):
        """Collect check-in/visit history"""
        try:
            from visits.models import Visit
            
            visits = Visit.objects.filter(user=self.user).select_related('club').order_by('-check_in_time')
            
            self.data['visits'] = {
                'total_count': visits.count(),
                'visits': [
                    {
                        'id': visit.id,
                        'club_name': visit.club.name if visit.club else None,
                        'check_in_time': visit.check_in_time.isoformat() if visit.check_in_time else None,
                        'check_out_time': visit.check_out_time.isoformat() if visit.check_out_time else None,
                        'duration_minutes': visit.duration_minutes if hasattr(visit, 'duration_minutes') else None,
                    }
                    for visit in visits[:1000]  # Limit to recent 1000
                ]
            }
            
            self.sections_collected.append('visits')
        except Exception as e:
            logger.error(f"Failed to collect visits data: {e}")
            self.sections_failed.append(f'visits: {str(e)}')
            self.data['visits'] = {'error': str(e)}
    
    def _collect_posts_data(self):
        """Collect user's posts and comments"""
        try:
            from posts.models import Post, Comment
            
            posts = Post.objects.filter(author=self.user).order_by('-created_at')
            
            self.data['posts'] = {
                'total_count': posts.count(),
                'posts': [
                    {
                        'id': post.id,
                        'content': post.content if hasattr(post, 'content') else None,
                        'created_at': post.created_at.isoformat() if hasattr(post, 'created_at') else None,
                        'updated_at': post.updated_at.isoformat() if hasattr(post, 'updated_at') else None,
                    }
                    for post in posts[:500]  # Limit to recent 500
                ]
            }
            
            # Comments (if Comment model exists)
            try:
                comments = Comment.objects.filter(author=self.user).order_by('-created_at')
                self.data['comments'] = {
                    'total_count': comments.count(),
                    'comments': [
                        {
                            'id': comment.id,
                            'content': comment.content,
                            'created_at': comment.created_at.isoformat(),
                        }
                        for comment in comments[:500]
                    ]
                }
            except:
                pass  # Comment model might not exist
            
            self.sections_collected.append('posts')
        except Exception as e:
            logger.error(f"Failed to collect posts data: {e}")
            self.sections_failed.append(f'posts: {str(e)}')
            self.data['posts'] = {'error': str(e)}
    
    def _collect_events_data(self):
        """Collect event registrations"""
        try:
            from events.models import EventRegistration
            
            registrations = EventRegistration.objects.filter(
                user=self.user
            ).select_related('event').order_by('-registered_at')
            
            self.data['events'] = {
                'total_count': registrations.count(),
                'registrations': [
                    {
                        'id': reg.id,
                        'event_title': reg.event.title if reg.event else None,
                        'event_date': reg.event.date.isoformat() if reg.event and hasattr(reg.event, 'date') and reg.event.date else None,
                        'registered_at': reg.registered_at.isoformat() if hasattr(reg, 'registered_at') else None,
                        'status': reg.status if hasattr(reg, 'status') else None,
                        'attended': reg.attended if hasattr(reg, 'attended') else None,
                    }
                    for reg in registrations[:500]
                ]
            }
            
            self.sections_collected.append('events')
        except Exception as e:
            logger.error(f"Failed to collect events data: {e}")
            self.sections_failed.append(f'events: {str(e)}')
            self.data['events'] = {'error': str(e)}
    
    def _collect_messages_data(self):
        """Collect messages (sent and received)"""
        try:
            from messenger.models import Message, MessageRecipient
            
            # Sent messages
            sent_messages = Message.objects.filter(sender=self.user).order_by('-sent_at')
            
            # Received messages
            received_message_ids = MessageRecipient.objects.filter(
                recipient=self.user
            ).values_list('message_id', flat=True)
            
            received_messages = Message.objects.filter(
                id__in=received_message_ids
            ).order_by('-sent_at')
            
            self.data['messages'] = {
                'sent_count': sent_messages.count(),
                'received_count': received_messages.count(),
                'sent_messages': [
                    {
                        'id': msg.id,
                        'content': msg.content if hasattr(msg, 'content') else None,
                        'sent_at': msg.sent_at.isoformat() if hasattr(msg, 'sent_at') else None,
                    }
                    for msg in sent_messages[:500]
                ],
                'received_messages': [
                    {
                        'id': msg.id,
                        'sender_email': msg.sender.email if msg.sender else None,
                        'content': msg.content if hasattr(msg, 'content') else None,
                        'sent_at': msg.sent_at.isoformat() if hasattr(msg, 'sent_at') else None,
                    }
                    for msg in received_messages[:500]
                ]
            }
            
            self.sections_collected.append('messages')
        except Exception as e:
            logger.error(f"Failed to collect messages data: {e}")
            self.sections_failed.append(f'messages: {str(e)}')
            self.data['messages'] = {'error': str(e)}
    
    def _collect_notifications_data(self):
        """Collect user notifications"""
        try:
            from notifications.models import Notification
            
            notifications = Notification.objects.filter(user=self.user).order_by('-created_at')
            
            self.data['notifications'] = {
                'total_count': notifications.count(),
                'notifications': [
                    {
                        'id': notif.id,
                        'title': notif.title if hasattr(notif, 'title') else None,
                        'message': notif.message if hasattr(notif, 'message') else None,
                        'created_at': notif.created_at.isoformat() if hasattr(notif, 'created_at') else None,
                        'is_read': notif.is_read if hasattr(notif, 'is_read') else None,
                    }
                    for notif in notifications[:500]
                ]
            }
            
            self.sections_collected.append('notifications')
        except Exception as e:
            logger.error(f"Failed to collect notifications data: {e}")
            self.sections_failed.append(f'notifications: {str(e)}')
            self.data['notifications'] = {'error': str(e)}
    
    def _collect_rewards_data(self):
        """Collect rewards earned and used"""
        try:
            from rewards.models import RewardUsage
            
            rewards = RewardUsage.objects.filter(user=self.user).select_related('reward').order_by('-earned_at')
            
            self.data['rewards'] = {
                'total_count': rewards.count(),
                'rewards': [
                    {
                        'id': usage.id,
                        'reward_name': usage.reward.name if usage.reward else None,
                        'earned_at': usage.earned_at.isoformat() if hasattr(usage, 'earned_at') else None,
                        'redeemed_at': usage.redeemed_at.isoformat() if hasattr(usage, 'redeemed_at') and usage.redeemed_at else None,
                        'status': usage.status if hasattr(usage, 'status') else None,
                    }
                    for usage in rewards
                ]
            }
            
            self.sections_collected.append('rewards')
        except Exception as e:
            logger.error(f"Failed to collect rewards data: {e}")
            self.sections_failed.append(f'rewards: {str(e)}')
            self.data['rewards'] = {'error': str(e)}
    
    def _collect_questionnaires_data(self):
        """Collect questionnaire responses"""
        try:
            from questionnaires.models import QuestionnaireResponse
            
            responses = QuestionnaireResponse.objects.filter(
                user=self.user
            ).select_related('questionnaire').order_by('-started_at')
            
            self.data['questionnaires'] = {
                'total_count': responses.count(),
                'responses': [
                    {
                        'id': resp.id,
                        'questionnaire_title': resp.questionnaire.title if resp.questionnaire else None,
                        'started_at': resp.started_at.isoformat() if hasattr(resp, 'started_at') else None,
                        'completed_at': resp.completed_at.isoformat() if hasattr(resp, 'completed_at') and resp.completed_at else None,
                        'answers': resp.answers if hasattr(resp, 'answers') else None,
                    }
                    for resp in responses
                ]
            }
            
            self.sections_collected.append('questionnaires')
        except Exception as e:
            logger.error(f"Failed to collect questionnaires data: {e}")
            self.sections_failed.append(f'questionnaires: {str(e)}')
            self.data['questionnaires'] = {'error': str(e)}
    
    def _collect_bookings_data(self):
        """Collect resource bookings"""
        try:
            from bookings.models import Booking
            
            bookings = Booking.objects.filter(user=self.user).select_related('resource').order_by('-start_time')
            
            self.data['bookings'] = {
                'total_count': bookings.count(),
                'bookings': [
                    {
                        'id': booking.id,
                        'resource_name': booking.resource.name if booking.resource else None,
                        'start_time': booking.start_time.isoformat() if hasattr(booking, 'start_time') else None,
                        'end_time': booking.end_time.isoformat() if hasattr(booking, 'end_time') else None,
                        'status': booking.status if hasattr(booking, 'status') else None,
                    }
                    for booking in bookings
                ]
            }
            
            self.sections_collected.append('bookings')
        except Exception as e:
            logger.error(f"Failed to collect bookings data: {e}")
            self.sections_failed.append(f'bookings: {str(e)}')
            self.data['bookings'] = {'error': str(e)}
    
    def _collect_inventory_data(self):
        """Collect inventory borrowing history"""
        try:
            from inventory.models import ItemBorrowing
            
            borrowings = ItemBorrowing.objects.filter(user=self.user).select_related('item').order_by('-borrowed_at')
            
            self.data['inventory'] = {
                'total_count': borrowings.count(),
                'borrowings': [
                    {
                        'id': borrow.id,
                        'item_name': borrow.item.name if borrow.item else None,
                        'borrowed_at': borrow.borrowed_at.isoformat() if hasattr(borrow, 'borrowed_at') else None,
                        'returned_at': borrow.returned_at.isoformat() if hasattr(borrow, 'returned_at') and borrow.returned_at else None,
                        'status': borrow.status if hasattr(borrow, 'status') else None,
                    }
                    for borrow in borrowings
                ]
            }
            
            self.sections_collected.append('inventory')
        except Exception as e:
            logger.error(f"Failed to collect inventory data: {e}")
            self.sections_failed.append(f'inventory: {str(e)}')
            self.data['inventory'] = {'error': str(e)}
    
    def _collect_groups_data(self):
        """Collect group memberships"""
        try:
            from groups.models import GroupMembership
            
            memberships = GroupMembership.objects.filter(
                user=self.user
            ).select_related('group').order_by('-joined_at')
            
            self.data['groups'] = {
                'total_count': memberships.count(),
                'memberships': [
                    {
                        'id': membership.id,
                        'group_name': membership.group.name if membership.group else None,
                        'joined_at': membership.joined_at.isoformat() if hasattr(membership, 'joined_at') else None,
                        'role': membership.role if hasattr(membership, 'role') else None,
                        'status': membership.status if hasattr(membership, 'status') else None,
                    }
                    for membership in memberships
                ]
            }
            
            self.sections_collected.append('groups')
        except Exception as e:
            logger.error(f"Failed to collect groups data: {e}")
            self.sections_failed.append(f'groups: {str(e)}')
            self.data['groups'] = {'error': str(e)}
    
    def _collect_audit_logs(self):
        """Collect user's audit trail"""
        try:
            from audit.models import AuditLog
            
            logs = AuditLog.objects.filter(user=self.user).order_by('-timestamp')
            
            self.data['audit_logs'] = {
                'total_count': logs.count(),
                'logs': [
                    {
                        'id': log.id,
                        'action': log.action,
                        'model_name': log.model_name,
                        'timestamp': log.timestamp.isoformat(),
                        'ip_address': log.ip_address,
                    }
                    for log in logs[:500]  # Limit to recent 500
                ]
            }
            
            self.sections_collected.append('audit_logs')
        except Exception as e:
            logger.error(f"Failed to collect audit logs: {e}")
            self.sections_failed.append(f'audit_logs: {str(e)}')
            self.data['audit_logs'] = {'error': str(e)}


