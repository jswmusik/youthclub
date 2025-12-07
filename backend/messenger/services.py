# backend/messenger/service.py

from django.db.models import Q
from django.contrib.auth import get_user_model
from users.models import GuardianYouthLink
from organization.models import Club
from .models import Conversation, Message, MessageRecipient

User = get_user_model()

class PermissionService:
    """
    Enforces the strict contact rules from 'Ungdomsappen 2.0 Messaging Spec - Section 3'.
    """

    @staticmethod
    def can_start_conversation(sender, recipient):
        """
        Determines if 'sender' is allowed to start a NEW conversation with 'recipient'.
        Returns (bool, reason_string).
        """
        # 1. Basic Active Checks
        if not sender.is_active:
            return False, "Your account is inactive"
        if not recipient.is_active:
            return False, "Recipient account is inactive"

        # 2. Role-based Logic
        role = sender.role
        
        if role == 'SUPER_ADMIN':
            return True, "Super Admin can contact anyone"

        elif role == 'MUNICIPALITY_ADMIN':
            return PermissionService._check_muni_admin_rules(sender, recipient)

        elif role == 'CLUB_ADMIN':
            return PermissionService._check_club_admin_rules(sender, recipient)

        elif role == 'YOUTH_MEMBER':
            return PermissionService._check_youth_rules(sender, recipient)

        elif role == 'GUARDIAN':
            return PermissionService._check_guardian_rules(sender, recipient)

        return False, "Unknown role"

    @staticmethod
    def _check_muni_admin_rules(sender, recipient):
        # Must be assigned to a municipality
        if not sender.assigned_municipality:
            return False, "You are not assigned to a municipality"

        # 1. Contact other Muni Admins in same municipality
        if recipient.role == 'MUNICIPALITY_ADMIN':
            if recipient.assigned_municipality == sender.assigned_municipality:
                return True, "OK"
        
        # 2. Contact Club Admins in same municipality
        if recipient.role == 'CLUB_ADMIN':
            if recipient.assigned_club and recipient.assigned_club.municipality == sender.assigned_municipality:
                return True, "OK"

        # 3. Contact Youth/Guardians in the municipality
        if recipient.role == 'YOUTH_MEMBER':
            if recipient.preferred_club and recipient.preferred_club.municipality == sender.assigned_municipality:
                return True, "OK"
        
        if recipient.role == 'GUARDIAN':
            # Check if guardian has ANY youth in this municipality
            has_youth = GuardianYouthLink.objects.filter(
                guardian=recipient,
                youth__preferred_club__municipality=sender.assigned_municipality
            ).exists()
            if has_youth:
                return True, "OK"

        return False, "Recipient is outside your municipality scope"

    @staticmethod
    def _check_club_admin_rules(sender, recipient):
        club = sender.assigned_club
        if not club:
            return False, "You are not assigned to a club"

        # 1. Contact other admins in same club
        if recipient.role == 'CLUB_ADMIN':
            if recipient.assigned_club == club:
                return True, "OK"
        
        # 2. Contact Youth in this club (Member or Follower)
        if recipient.role == 'YOUTH_MEMBER':
            is_member = recipient.preferred_club == club
            is_follower = recipient.followed_clubs.filter(id=club.id).exists()
            if is_member or is_follower:
                return True, "OK"

        # 3. Contact Guardians linked to youth in this club
        if recipient.role == 'GUARDIAN':
            has_youth_in_club = GuardianYouthLink.objects.filter(
                guardian=recipient,
                youth__preferred_club=club
            ).exists()
            if has_youth_in_club:
                return True, "OK"
                
        return False, "Recipient is not connected to your club"

    @staticmethod
    def _check_youth_rules(sender, recipient):
        # Youth CANNOT contact Youth or Guardians
        if recipient.role in ['YOUTH_MEMBER', 'GUARDIAN']:
            return False, "Youth cannot contact other youth or guardians"

        # Youth CAN contact Club Admins of their preferred or followed clubs
        if recipient.role == 'CLUB_ADMIN':
            club = recipient.assigned_club
            if club:
                is_preferred = sender.preferred_club == club
                is_following = sender.followed_clubs.filter(id=club.id).exists()
                if is_preferred or is_following:
                    # Check if admin allows contact (Graceful fallback if field missing)
                    if getattr(recipient, 'allow_youth_contact', True):
                        return True, "OK"
                    else:
                        return False, "This admin does not accept messages from youth"

        return False, "You cannot start a conversation with this user"

    @staticmethod
    def _check_guardian_rules(sender, recipient):
        # Guardian CANNOT contact Youth or Guardians
        if recipient.role in ['YOUTH_MEMBER', 'GUARDIAN']:
            return False, "Guardians cannot contact youth or other guardians"

        # Guardian CAN contact Club Admins of their children's clubs
        if recipient.role == 'CLUB_ADMIN':
            admin_club = recipient.assigned_club
            if not admin_club:
                return False, "Target admin has no assigned club"
                
            # Find all clubs associated with this guardian's children
            my_youth_clubs = Club.objects.filter(
                members__guardian_links__guardian=sender
            ).distinct()
            
            if admin_club in my_youth_clubs:
                # Check if admin allows contact
                if getattr(recipient, 'allow_guardian_contact', True):
                    return True, "OK"
                else:
                    return False, "This admin does not accept messages from guardians"

        return False, "You cannot start a conversation with this user"


class BroadcastService:
    """
    Handles logic for 'Section 8: Admin Broadcast & Segmentation'.
    Resolves filters into a list of recipients.
    """

    @staticmethod
    def resolve_recipients(sender, filters):
        """
        Args:
            sender: User (Admin)
            filters: dict containing:
                - target_level: 'GLOBAL', 'MUNICIPALITY', 'CLUB'
                - target_id: ID (optional if implied by sender)
                - recipient_type: 'YOUTH', 'GUARDIAN', 'BOTH', 'ADMINS'
                - specific_filters: { 'grade': 5, 'gender': 'MALE', 'interests': [1,2] }
        Returns:
            QuerySet[User]
        """
        # 1. Base Scope
        recipients = User.objects.none()
        role = sender.role
        
        # Determine Base QuerySet based on Scope
        scope_users = User.objects.all()
        
        # Filter scope by Target Level
        target_level = filters.get('target_level')
        
        if target_level == 'CLUB':
            # Use provided ID or sender's assigned club
            club_id = filters.get('target_id') or (sender.assigned_club.id if sender.assigned_club else None)
            if not club_id: 
                return User.objects.none()
            
            # Users associated with this club
            scope_users = User.objects.filter(
                Q(preferred_club_id=club_id) | 
                Q(followed_clubs__id=club_id) |
                Q(youth_links__youth__preferred_club_id=club_id)
            ).distinct()

        elif target_level == 'MUNICIPALITY':
            # Use provided ID or sender's assigned municipality
            muni_id = filters.get('target_id') or (sender.assigned_municipality.id if sender.assigned_municipality else None)
            if not muni_id: 
                return User.objects.none()
            
            scope_users = User.objects.filter(
                Q(preferred_club__municipality_id=muni_id) |
                Q(youth_links__youth__preferred_club__municipality_id=muni_id)
            ).distinct()

        # 2. Filter by Recipient Type
        r_type = filters.get('recipient_type')
        
        if r_type == 'YOUTH':
            recipients = scope_users.filter(role='YOUTH_MEMBER')
        elif r_type == 'GUARDIAN':
            recipients = scope_users.filter(role='GUARDIAN')
        elif r_type == 'BOTH':
            recipients = scope_users.filter(role__in=['YOUTH_MEMBER', 'GUARDIAN'])
        elif r_type == 'ADMINS' and role == 'SUPER_ADMIN':
            # Only Super Admin can broadcast to admins
            recipients = scope_users.filter(role__in=['MUNICIPALITY_ADMIN', 'CLUB_ADMIN'])

        # 3. Apply Segmentation Filters (Spec 8.1)
        spec_filters = filters.get('specific_filters', {})
        
        if spec_filters.get('gender'):
            recipients = recipients.filter(legal_gender=spec_filters['gender'])
            
        if spec_filters.get('grade'):
            recipients = recipients.filter(grade=spec_filters['grade'])
            
        if spec_filters.get('interests'):
            # ManyToMany filter: users who have ANY of these interests
            recipients = recipients.filter(interests__id__in=spec_filters['interests'])

        # Exclude the sender themselves if they happened to be caught in the filter
        return recipients.exclude(id=sender.id).distinct()

    @staticmethod
    def send_broadcast(sender, recipients, subject, content, attachment=None):
        """
        Creates the message structure efficiently using bulk_create.
        """
        if not recipients:
            return None

        # 1. Create the Conversation (Broadcast Source)
        conversation = Conversation.objects.create(
            type=Conversation.Type.BROADCAST,
            subject=subject,
            is_broadcast_source=True
        )
        # Add sender as the only participant in the source thread
        conversation.participants.add(sender)

        # 2. Create the Message
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=content,
            attachment=attachment
        )

        # 3. Bulk Create Recipients
        recipient_objects = [
            MessageRecipient(
                message=message,
                recipient=user,
                is_read=False
            ) for user in recipients
        ]
        MessageRecipient.objects.bulk_create(recipient_objects)

        return conversation