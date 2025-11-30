"""
PostEngine: Filters and serves posts to users based on targeting criteria.

This engine implements the logic to determine which posts a user should see
based on all the targeting rules defined in the Post model.
"""
from django.db.models import Q, Count, Exists, OuterRef, Prefetch
from django.utils import timezone
from .models import Post, PostReaction
from users.models import User
from groups.models import GroupMembership
from custom_fields.models import CustomFieldValue


class PostEngine:
    """
    Engine that filters posts based on user attributes and post targeting criteria.
    """
    
    @staticmethod
    def get_posts_for_user(user: User, queryset=None):
        """
        Returns a queryset of posts that should be visible to the given user.
        
        Args:
            user: The User object to get posts for
            queryset: Optional base queryset (defaults to all published posts)
        
        Returns:
            QuerySet of Post objects filtered and annotated with reaction data
        """
        now = timezone.now()
        
        # Start with published posts only
        if queryset is None:
            queryset = Post.objects.filter(status=Post.Status.PUBLISHED)
        
        # Filter by status and visibility windows
        queryset = queryset.filter(
            status=Post.Status.PUBLISHED
        ).filter(
            Q(published_at__isnull=True) | Q(published_at__lte=now)
        ).filter(
            Q(visibility_start_date__isnull=True) | Q(visibility_start_date__lte=now)
        ).filter(
            Q(visibility_end_date__isnull=True) | Q(visibility_end_date__gte=now)
        )
        
        # Build the filter conditions
        conditions = Q()
        
        # 1. Global posts (visible to everyone)
        conditions |= Q(is_global=True)
        
        # 2. Municipality/Club targeting
        # If a post has specific club targeting, it should ONLY show to users from that club
        # If a post has municipality targeting but no club targeting, show to all users in that municipality
        club_condition = Q()
        if user.preferred_club:
            # User's preferred club
            club_condition |= Q(target_clubs=user.preferred_club)
            # Municipality of user's preferred club (only if post doesn't have specific club targeting)
            if user.preferred_club.municipality:
                # Posts with municipality targeting but no specific club targeting
                club_condition |= Q(
                    target_municipalities=user.preferred_club.municipality,
                    target_clubs__isnull=True
                ) | Q(
                    target_municipalities=user.preferred_club.municipality,
                    target_clubs=None
                )
        
        # Only add club condition if user has a preferred club
        if user.preferred_club:
            conditions |= club_condition
        
        # 3. Member type targeting
        if user.role == User.Role.YOUTH_MEMBER:
            conditions |= Q(target_member_type__in=[Post.TargetMemberType.YOUTH, Post.TargetMemberType.BOTH])
        elif user.role == User.Role.GUARDIAN:
            conditions |= Q(target_member_type__in=[Post.TargetMemberType.GUARDIAN, Post.TargetMemberType.BOTH])
        
        # 4. Group targeting (if user is in any groups)
        user_group_ids = GroupMembership.objects.filter(
            user=user,
            status=GroupMembership.Status.APPROVED
        ).values_list('group_id', flat=True)
        
        if user_group_ids:
            conditions |= Q(target_groups__id__in=user_group_ids)
        
        # 5. Interest targeting
        user_interest_ids = user.interests.values_list('id', flat=True)
        if user_interest_ids:
            conditions |= Q(target_interests__id__in=user_interest_ids)
        
        # 6. Gender targeting - handled in Python for SQLite compatibility
        # We'll filter this after the initial query
        
        # 7. Grade targeting - handled in Python for SQLite compatibility
        # We'll filter this after the initial query
        
        # 8. Age targeting
        if user.age is not None:
            conditions |= (
                (Q(target_min_age__isnull=True) | Q(target_min_age__lte=user.age)) &
                (Q(target_max_age__isnull=True) | Q(target_max_age__gte=user.age))
            )
        
        # 9. Custom field targeting
        # Get user's custom field values
        user_custom_fields = CustomFieldValue.objects.filter(user=user).select_related('field')
        custom_field_dict = {cfv.field_id: cfv.value for cfv in user_custom_fields}
        
        # Get user's approved group IDs (for group targeting check)
        user_group_ids = list(GroupMembership.objects.filter(
            user=user,
            status=GroupMembership.Status.APPROVED
        ).values_list('group_id', flat=True))
        
        # Apply the main conditions first
        queryset = queryset.filter(conditions)
        
        # Get initial matching posts (these match primary targeting: global, club, municipality, group, interest)
        # Now we need to filter by JSON fields (gender, grade, custom fields) and enforce club/group targeting in Python
        matching_post_ids = []
        
        for post in queryset:
            # IMPORTANT: Check club targeting first - if post targets specific clubs, user MUST be in one of them
            if post.target_clubs.exists():
                # Post has specific club targeting
                if not user.preferred_club or not post.target_clubs.filter(id=user.preferred_club.id).exists():
                    # User is not in any of the targeted clubs, skip this post
                    continue
            
            # Check municipality targeting (only if no specific club targeting)
            if not post.target_clubs.exists() and post.target_municipalities.exists():
                # Post targets municipalities but not specific clubs
                if not user.preferred_club or not user.preferred_club.municipality:
                    continue
                if not post.target_municipalities.filter(id=user.preferred_club.municipality.id).exists():
                    # User's municipality is not in the targeted municipalities
                    continue
            
            # IMPORTANT: Check group targeting - if post targets specific groups, user MUST be in one of them
            if post.target_groups.exists():
                # Post has specific group targeting
                post_group_ids = list(post.target_groups.values_list('id', flat=True))
                # Check if user is in any of the targeted groups
                if not any(group_id in user_group_ids for group_id in post_group_ids):
                    # User is not in any of the targeted groups, skip this post
                    continue
            
            # IMPORTANT: Check interest targeting - if post targets specific interests, user MUST have one of them
            if post.target_interests.exists():
                # Post has specific interest targeting
                post_interest_ids = list(post.target_interests.values_list('id', flat=True))
                user_interest_ids = list(user.interests.values_list('id', flat=True))
                # Check if user has any of the targeted interests
                if not any(interest_id in user_interest_ids for interest_id in post_interest_ids):
                    # User doesn't have any of the targeted interests, skip this post
                    continue
            
            # IMPORTANT: Check member type targeting - user's role MUST match the post's target member type
            if post.target_member_type == Post.TargetMemberType.YOUTH:
                # Post is only for youth members
                if user.role != User.Role.YOUTH_MEMBER:
                    # User is not a youth member, skip this post
                    continue
            elif post.target_member_type == Post.TargetMemberType.GUARDIAN:
                # Post is only for guardians
                if user.role != User.Role.GUARDIAN:
                    # User is not a guardian, skip this post
                    continue
            # If target_member_type is BOTH, everyone can see it (no check needed)
            
            # Check gender targeting
            # If post has gender targeting, user MUST have a gender and it MUST match
            post_genders = post.target_genders or []
            if post_genders:
                # Post has specific gender targeting
                if not user.legal_gender:
                    # User doesn't have a gender set, skip this post
                    continue
                if user.legal_gender not in post_genders:
                    # User's gender is not in the targeted genders, skip this post
                    continue
            
            # Check grade targeting
            if user.grade:
                post_grades = post.target_grades or []
                # If post has grade targeting and user's grade is not in the list, skip
                if post_grades and user.grade not in post_grades:
                    continue  # Grade doesn't match, skip this post
            
            # IMPORTANT: Check age targeting - user's age MUST be within the post's age range
            if post.target_min_age is not None or post.target_max_age is not None:
                # Post has age targeting
                if user.age is None:
                    # User doesn't have an age set, skip this post
                    continue
                # Check if user's age is within the range
                if post.target_min_age is not None and user.age < post.target_min_age:
                    # User is too young, skip this post
                    continue
                if post.target_max_age is not None and user.age > post.target_max_age:
                    # User is too old, skip this post
                    continue
            
            # Check custom field targeting
            post_custom_targets = post.target_custom_fields or {}
            if post_custom_targets:
                matches_custom = True
                for field_id_str, required_value in post_custom_targets.items():
                    try:
                        field_id = int(field_id_str)
                        user_value = custom_field_dict.get(field_id)
                        
                        # If the field is required but user doesn't have it, or value doesn't match
                        if user_value is None or user_value != required_value:
                            matches_custom = False
                            break
                    except (ValueError, TypeError):
                        continue
                
                if not matches_custom:
                    continue  # Custom fields don't match, skip this post
            
            # If we get here, the post matches all criteria
            matching_post_ids.append(post.id)
        
        # Filter to only matching posts
        if not matching_post_ids:
            # Return empty queryset if no posts match
            queryset = Post.objects.none()
        else:
            queryset = Post.objects.filter(id__in=matching_post_ids)
        
        # Annotate with reaction data and comment count (only approved comments)
        if user.is_authenticated:
            queryset = queryset.annotate(
                reaction_count=Count('reactions'),
                comment_count=Count('comments', filter=Q(comments__is_approved=True)),
                user_has_reacted=Exists(
                    PostReaction.objects.filter(
                        post=OuterRef('pk'),
                        user=user
                    )
                )
            )
        else:
            queryset = queryset.annotate(
                reaction_count=Count('reactions'),
                comment_count=Count('comments', filter=Q(comments__is_approved=True))
            )
        
        # Order by pinned first, then by published_at/created_at
        queryset = queryset.order_by('-is_pinned', '-published_at', '-created_at')
        
        return queryset.distinct()
    
    @staticmethod
    def user_can_see_post(user: User, post: Post) -> bool:
        """
        Check if a specific user can see a specific post.
        Useful for permission checks.
        
        Args:
            user: The User object
            post: The Post object to check
        
        Returns:
            bool: True if user can see the post, False otherwise
        """
        now = timezone.now()
        
        # Must be published
        if post.status != Post.Status.PUBLISHED:
            return False
        
        # Check published_at
        if post.published_at and post.published_at > now:
            return False
        
        # Check visibility window
        if post.visibility_start_date and post.visibility_start_date > now:
            return False
        if post.visibility_end_date and post.visibility_end_date < now:
            return False
        
        # Check global posts
        if post.is_global:
            return True
        
        # Check municipality/club targeting
        if user.preferred_club:
            if post.target_clubs.filter(id=user.preferred_club.id).exists():
                return True
            if user.preferred_club.municipality and post.target_municipalities.filter(id=user.preferred_club.municipality.id).exists():
                return True
        
        # Check member type
        if user.role == User.Role.YOUTH_MEMBER:
            if post.target_member_type not in [Post.TargetMemberType.YOUTH, Post.TargetMemberType.BOTH]:
                return False
        elif user.role == User.Role.GUARDIAN:
            if post.target_member_type not in [Post.TargetMemberType.GUARDIAN, Post.TargetMemberType.BOTH]:
                return False
        
        # Check group targeting
        if post.target_groups.exists():
            user_groups = GroupMembership.objects.filter(
                user=user,
                status=GroupMembership.Status.APPROVED,
                group__in=post.target_groups.all()
            ).exists()
            if not user_groups:
                return False
        
        # Check interest targeting
        if post.target_interests.exists():
            user_interests = user.interests.filter(id__in=post.target_interests.values_list('id', flat=True)).exists()
            if not user_interests:
                return False
        
        # Check gender targeting
        if post.target_genders and user.legal_gender:
            if user.legal_gender not in post.target_genders:
                return False
        
        # Check grade targeting
        if post.target_grades and user.grade:
            if user.grade not in post.target_grades:
                return False
        
        # Check age targeting
        if user.age is not None:
            if post.target_min_age and user.age < post.target_min_age:
                return False
            if post.target_max_age and user.age > post.target_max_age:
                return False
        
        # Check custom field targeting
        if post.target_custom_fields:
            user_custom_fields = CustomFieldValue.objects.filter(user=user).select_related('field')
            custom_field_dict = {cfv.field_id: cfv.value for cfv in user_custom_fields}
            
            for field_id_str, required_value in post.target_custom_fields.items():
                try:
                    field_id = int(field_id_str)
                    user_value = custom_field_dict.get(field_id)
                    if user_value is None or user_value != required_value:
                        return False
                except (ValueError, TypeError):
                    continue
        
        return True

