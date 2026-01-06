"""
Comprehensive tests for the Groups feature.

These tests cover:
- Group creation and management
- Membership join/leave logic
- Eligibility enforcement
- Permission checks
- Group types (OPEN, APPLICATION, CLOSED)
- Rejection and re-application logic
"""

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from rest_framework.permissions import BasePermission
from datetime import date, timedelta
from unittest.mock import patch, MagicMock
from .models import Group, GroupMembership
from organization.models import Municipality, Club, Interest, Country
from licensing.models import Feature, Plan, License

User = get_user_model()


def create_test_license_for_municipality(municipality):
    """Helper to create a license with the 'groups' feature for testing."""
    # Create the groups feature
    groups_feature, _ = Feature.objects.get_or_create(
        slug='groups',
        defaults={'name': 'Groups', 'description': 'Groups feature'}
    )
    
    # Create a plan with the groups feature
    plan, _ = Plan.objects.get_or_create(
        name='Test Plan',
        defaults={'description': 'Test plan with groups feature'}
    )
    plan.features.add(groups_feature)
    
    # Create a license for the municipality
    license_obj, _ = License.objects.get_or_create(
        municipality=municipality,
        defaults={
            'plan': plan,
            'start_date': date.today() - timedelta(days=30),
            'end_date': date.today() + timedelta(days=365),
            'is_active': True
        }
    )
    return license_obj




class GroupModelTests(TestCase):
    """Tests for the Group model."""
    
    def setUp(self):
        self.country = Country.objects.create(name="Sweden", country_code="SE", description="Test country")
        self.municipality = Municipality.objects.create(
            name="Test Municipality",
            country=self.country,
            description="Test description",
            terms_and_conditions="Test terms"
        )
        self.club = Club.objects.create(
            name="Test Club",
            municipality=self.municipality
        )
    
    def test_create_open_group(self):
        """Test creating an OPEN group."""
        group = Group.objects.create(
            name="Open Group",
            description="An open group for testing",
            group_type="OPEN",
            club=self.club
        )
        self.assertEqual(group.group_type, "OPEN")
        self.assertEqual(group.club, self.club)
        self.assertFalse(group.is_system_group)
    
    def test_create_application_group(self):
        """Test creating an APPLICATION group."""
        group = Group.objects.create(
            name="Application Group",
            description="Requires application",
            group_type="APPLICATION",
            municipality=self.municipality
        )
        self.assertEqual(group.group_type, "APPLICATION")
        self.assertEqual(group.municipality, self.municipality)
    
    def test_create_closed_group(self):
        """Test creating a CLOSED group."""
        group = Group.objects.create(
            name="Closed Group",
            description="Invite only",
            group_type="CLOSED",
            club=self.club
        )
        self.assertEqual(group.group_type, "CLOSED")
    
    def test_group_with_eligibility_criteria(self):
        """Test creating a group with eligibility criteria."""
        group = Group.objects.create(
            name="Restricted Group",
            group_type="OPEN",
            club=self.club,
            min_age=13,
            max_age=18,
            grades=[7, 8, 9],
            genders=["MALE", "FEMALE"],
            target_member_type="YOUTH"
        )
        self.assertEqual(group.min_age, 13)
        self.assertEqual(group.max_age, 18)
        self.assertEqual(group.grades, [7, 8, 9])
        self.assertEqual(group.genders, ["MALE", "FEMALE"])


class GroupMembershipTests(TestCase):
    """Tests for GroupMembership model."""
    
    def setUp(self):
        self.country = Country.objects.create(name="Sweden", country_code="SE", description="Test country")
        self.municipality = Municipality.objects.create(
            name="Test Municipality",
            country=self.country,
            description="Test description",
            terms_and_conditions="Test terms"
        )
        self.club = Club.objects.create(name="Test Club", municipality=self.municipality)
        self.group = Group.objects.create(
            name="Test Group",
            group_type="OPEN",
            club=self.club
        )
        self.user = User.objects.create_user(
            email="youth@test.com",
            password="testpass123",
            role="YOUTH_MEMBER",
            first_name="Test",
            last_name="Youth"
        )
    
    def test_create_membership(self):
        """Test creating a group membership."""
        membership = GroupMembership.objects.create(
            group=self.group,
            user=self.user,
            status="APPROVED"
        )
        self.assertEqual(membership.status, "APPROVED")
        self.assertEqual(membership.role, "MEMBER")
        self.assertEqual(membership.rejection_count, 0)
    
    def test_unique_membership(self):
        """Test that a user can only have one membership per group."""
        GroupMembership.objects.create(
            group=self.group,
            user=self.user,
            status="APPROVED"
        )
        # Attempting to create another should raise IntegrityError
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            GroupMembership.objects.create(
                group=self.group,
                user=self.user,
                status="PENDING"
            )


class GroupJoinAPITests(APITestCase):
    """Tests for the group join/leave API endpoints."""
    
    def setUp(self):
        self.country = Country.objects.create(name="Sweden", country_code="SE", description="Test country")
        self.municipality = Municipality.objects.create(
            name="Test Municipality",
            country=self.country,
            description="Test description",
            terms_and_conditions="Test terms"
        )
        self.club = Club.objects.create(name="Test Club", municipality=self.municipality)
        
        # Create license for the municipality
        create_test_license_for_municipality(self.municipality)
        
        # Create a youth user
        self.youth_user = User.objects.create_user(
            email="youth@test.com",
            password="testpass123",
            role="YOUTH_MEMBER",
            first_name="Test",
            last_name="Youth",
            date_of_birth=date.today() - timedelta(days=365*15),  # 15 years old
            grade=9,
            legal_gender="MALE"
        )
        self.youth_user.preferred_club = self.club
        self.youth_user.save()
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="testpass123",
            role="CLUB_ADMIN",
            first_name="Admin",
            last_name="User"
        )
        self.admin_user.assigned_club = self.club
        self.admin_user.save()
        
        self.client = APIClient()
    
    def test_join_open_group(self):
        """Test that a user can join an OPEN group immediately."""
        group = Group.objects.create(
            name="Open Group",
            group_type="OPEN",
            club=self.club
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'APPROVED')
        
        # Verify membership was created
        membership = GroupMembership.objects.get(group=group, user=self.youth_user)
        self.assertEqual(membership.status, 'APPROVED')
    
    def test_join_application_group(self):
        """Test that joining an APPLICATION group creates a PENDING membership."""
        group = Group.objects.create(
            name="Application Group",
            group_type="APPLICATION",
            club=self.club
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'PENDING')
        
        # Verify membership was created as PENDING
        membership = GroupMembership.objects.get(group=group, user=self.youth_user)
        self.assertEqual(membership.status, 'PENDING')
    
    def test_cannot_join_closed_group(self):
        """Test that a user cannot join a CLOSED group (returns 404 as CLOSED groups are invisible to non-members)."""
        group = Group.objects.create(
            name="Closed Group",
            group_type="CLOSED",
            club=self.club
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        # CLOSED groups return 404 for non-members (they are invisible)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_cannot_join_twice(self):
        """Test that a user cannot join a group they're already in."""
        group = Group.objects.create(
            name="Open Group",
            group_type="OPEN",
            club=self.club
        )
        
        # First join
        GroupMembership.objects.create(
            group=group,
            user=self.youth_user,
            status="APPROVED"
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Already a member", response.data['message'])
    
    def test_leave_group(self):
        """Test that a user can leave a group."""
        group = Group.objects.create(
            name="Open Group",
            group_type="OPEN",
            club=self.club
        )
        GroupMembership.objects.create(
            group=group,
            user=self.youth_user,
            status="APPROVED"
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/leave/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify membership was deleted
        self.assertFalse(
            GroupMembership.objects.filter(group=group, user=self.youth_user).exists()
        )


class GroupEligibilityTests(APITestCase):
    """Tests for eligibility enforcement on the backend."""
    
    def setUp(self):
        self.country = Country.objects.create(name="Sweden", country_code="SE", description="Test country")
        self.municipality = Municipality.objects.create(
            name="Test Municipality",
            country=self.country,
            description="Test description",
            terms_and_conditions="Test terms"
        )
        self.club = Club.objects.create(name="Test Club", municipality=self.municipality)
        
        # Create license for the municipality
        create_test_license_for_municipality(self.municipality)
        
        # Create a 15-year-old youth user
        self.youth_user = User.objects.create_user(
            email="youth@test.com",
            password="testpass123",
            role="YOUTH_MEMBER",
            first_name="Test",
            last_name="Youth",
            date_of_birth=date.today() - timedelta(days=365*15),
            grade=9,
            legal_gender="MALE"
        )
        self.youth_user.preferred_club = self.club
        self.youth_user.save()
        
        self.client = APIClient()
    
    def test_age_restriction_too_young(self):
        """Test that users below minimum age cannot join."""
        group = Group.objects.create(
            name="Adults Only",
            group_type="OPEN",
            club=self.club,
            min_age=18
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("eligibility", response.data['message'].lower())
    
    def test_age_restriction_too_old(self):
        """Test that users above maximum age cannot join."""
        group = Group.objects.create(
            name="Kids Only",
            group_type="OPEN",
            club=self.club,
            max_age=10
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_grade_restriction(self):
        """Test that users not in allowed grades cannot join."""
        group = Group.objects.create(
            name="Grade 7 Only",
            group_type="OPEN",
            club=self.club,
            grades=[7]  # User is in grade 9
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_gender_restriction(self):
        """Test that users not matching gender criteria cannot join."""
        group = Group.objects.create(
            name="Girls Only",
            group_type="OPEN",
            club=self.club,
            genders=["FEMALE"]  # User is MALE
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_member_type_restriction(self):
        """Test that guardians cannot join youth-only groups."""
        guardian = User.objects.create_user(
            email="guardian@test.com",
            password="testpass123",
            role="GUARDIAN",
            first_name="Test",
            last_name="Guardian"
        )
        guardian.preferred_club = self.club
        guardian.save()
        
        group = Group.objects.create(
            name="Youth Only",
            group_type="OPEN",
            club=self.club,
            target_member_type="YOUTH"
        )
        
        self.client.force_authenticate(user=guardian)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_eligible_user_can_join(self):
        """Test that an eligible user can join a restricted group."""
        group = Group.objects.create(
            name="Restricted Group",
            group_type="OPEN",
            club=self.club,
            min_age=13,
            max_age=18,
            grades=[8, 9, 10],
            genders=["MALE", "FEMALE"],
            target_member_type="YOUTH"
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class GroupRejectionTests(APITestCase):
    """Tests for rejection and re-application logic."""
    
    def setUp(self):
        self.country = Country.objects.create(name="Sweden", country_code="SE", description="Test country")
        self.municipality = Municipality.objects.create(
            name="Test Municipality",
            country=self.country,
            description="Test description",
            terms_and_conditions="Test terms"
        )
        self.club = Club.objects.create(name="Test Club", municipality=self.municipality)
        
        # Create license for the municipality
        create_test_license_for_municipality(self.municipality)
        
        self.youth_user = User.objects.create_user(
            email="youth@test.com",
            password="testpass123",
            role="YOUTH_MEMBER"
        )
        self.youth_user.preferred_club = self.club
        self.youth_user.save()
        
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="testpass123",
            role="CLUB_ADMIN"
        )
        self.admin_user.assigned_club = self.club
        self.admin_user.save()
        
        self.group = Group.objects.create(
            name="Application Group",
            group_type="APPLICATION",
            club=self.club
        )
        
        self.client = APIClient()
    
    def test_reapply_after_rejection(self):
        """Test that a user can re-apply after being rejected."""
        # Create rejected membership
        membership = GroupMembership.objects.create(
            group=self.group,
            user=self.youth_user,
            status="REJECTED",
            rejection_count=1
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{self.group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify status changed to PENDING
        membership.refresh_from_db()
        self.assertEqual(membership.status, "PENDING")
        self.assertEqual(membership.rejection_count, 1)  # Count should not change
    
    def test_cannot_reapply_after_three_rejections(self):
        """Test that a user cannot re-apply after 3 rejections."""
        GroupMembership.objects.create(
            group=self.group,
            user=self.youth_user,
            status="REJECTED",
            rejection_count=3
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(f'/api/groups/{self.group.id}/join/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Maximum application attempts", response.data['message'])


class GroupPermissionTests(APITestCase):
    """Tests for admin permission checks."""
    
    def setUp(self):
        self.country = Country.objects.create(name="Sweden", country_code="SE", description="Test country")
        self.municipality = Municipality.objects.create(
            name="Test Municipality",
            country=self.country,
            description="Test description",
            terms_and_conditions="Test terms"
        )
        self.club = Club.objects.create(name="Test Club", municipality=self.municipality)
        
        # Create license for the municipality
        create_test_license_for_municipality(self.municipality)
        
        self.youth_user = User.objects.create_user(
            email="youth@test.com",
            password="testpass123",
            role="YOUTH_MEMBER"
        )
        
        self.club_admin = User.objects.create_user(
            email="clubadmin@test.com",
            password="testpass123",
            role="CLUB_ADMIN"
        )
        self.club_admin.assigned_club = self.club
        self.club_admin.save()
        
        self.group = Group.objects.create(
            name="Test Group",
            group_type="APPLICATION",
            club=self.club
        )
        
        self.membership = GroupMembership.objects.create(
            group=self.group,
            user=self.youth_user,
            status="PENDING"
        )
        
        self.client = APIClient()
    
    def test_youth_cannot_approve_members(self):
        """Test that youth users cannot approve membership requests."""
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(
            f'/api/groups/{self.group.id}/approve_member/',
            {'membership_id': self.membership.id}
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_youth_cannot_remove_members(self):
        """Test that youth users cannot remove members."""
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.post(
            f'/api/groups/{self.group.id}/remove_member/',
            {'membership_id': self.membership.id}
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_can_approve_members(self):
        """Test that admins can approve membership requests."""
        self.client.force_authenticate(user=self.club_admin)
        response = self.client.post(
            f'/api/groups/{self.group.id}/approve_member/',
            {'membership_id': self.membership.id}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify membership was approved
        self.membership.refresh_from_db()
        self.assertEqual(self.membership.status, "APPROVED")
    
    def test_admin_can_remove_members(self):
        """Test that admins can remove members."""
        self.client.force_authenticate(user=self.club_admin)
        response = self.client.post(
            f'/api/groups/{self.group.id}/remove_member/',
            {'membership_id': self.membership.id}
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify membership was deleted
        self.assertFalse(
            GroupMembership.objects.filter(id=self.membership.id).exists()
        )


class GroupDuplicateTests(APITestCase):
    """Tests for group duplication functionality."""
    
    def setUp(self):
        self.country = Country.objects.create(name="Sweden", country_code="SE", description="Test country")
        self.municipality = Municipality.objects.create(
            name="Test Municipality",
            country=self.country,
            description="Test description",
            terms_and_conditions="Test terms"
        )
        self.club = Club.objects.create(name="Test Club", municipality=self.municipality)
        
        # Create license for the municipality
        create_test_license_for_municipality(self.municipality)
        self.interest = Interest.objects.create(name="Gaming")
        
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="testpass123",
            role="CLUB_ADMIN"
        )
        self.admin_user.assigned_club = self.club
        self.admin_user.save()
        
        self.group = Group.objects.create(
            name="Original Group",
            description="Original description",
            group_type="OPEN",
            club=self.club,
            min_age=13,
            max_age=18
        )
        self.group.interests.add(self.interest)
        
        self.client = APIClient()
    
    def test_duplicate_group(self):
        """Test that duplicating a group copies all properties including interests."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(f'/api/groups/{self.group.id}/duplicate/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the new group was created
        self.assertEqual(response.data['name'], "Original Group (Copy)")
        
        # Verify interests were copied
        new_group = Group.objects.get(id=response.data['id'])
        self.assertTrue(new_group.interests.filter(id=self.interest.id).exists())
        
        # Verify it's not marked as system group
        self.assertFalse(new_group.is_system_group)


class GroupVisibilityTests(APITestCase):
    """Tests for group visibility based on type and membership."""
    
    def setUp(self):
        self.country = Country.objects.create(name="Sweden", country_code="SE", description="Test country")
        self.municipality = Municipality.objects.create(
            name="Test Municipality",
            country=self.country,
            description="Test description",
            terms_and_conditions="Test terms"
        )
        self.club = Club.objects.create(name="Test Club", municipality=self.municipality)
        
        # Create license for the municipality
        create_test_license_for_municipality(self.municipality)
        
        self.youth_user = User.objects.create_user(
            email="youth@test.com",
            password="testpass123",
            role="YOUTH_MEMBER"
        )
        self.youth_user.preferred_club = self.club
        self.youth_user.save()
        
        self.client = APIClient()
    
    def test_closed_group_not_visible_to_non_members(self):
        """Test that CLOSED groups are not visible to non-members in list view."""
        closed_group = Group.objects.create(
            name="Closed Group",
            group_type="CLOSED",
            club=self.club
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.get('/api/groups/')
        
        # The closed group should not appear in the list
        group_ids = [g['id'] for g in response.data.get('results', response.data)]
        self.assertNotIn(closed_group.id, group_ids)
    
    def test_closed_group_visible_to_members(self):
        """Test that CLOSED groups are visible to members."""
        closed_group = Group.objects.create(
            name="Closed Group",
            group_type="CLOSED",
            club=self.club
        )
        
        # Add user as member
        GroupMembership.objects.create(
            group=closed_group,
            user=self.youth_user,
            status="APPROVED"
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.get('/api/groups/')
        
        # The closed group should appear in the list
        group_ids = [g['id'] for g in response.data.get('results', response.data)]
        self.assertIn(closed_group.id, group_ids)
    
    def test_member_can_access_closed_group_detail(self):
        """Test that members can access CLOSED group details."""
        closed_group = Group.objects.create(
            name="Closed Group",
            group_type="CLOSED",
            club=self.club
        )
        
        # Add user as member
        GroupMembership.objects.create(
            group=closed_group,
            user=self.youth_user,
            status="APPROVED"
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.get(f'/api/groups/{closed_group.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Closed Group")
    
    def test_non_member_cannot_access_closed_group_detail(self):
        """Test that non-members cannot access CLOSED group details."""
        closed_group = Group.objects.create(
            name="Closed Group",
            group_type="CLOSED",
            club=self.club
        )
        
        self.client.force_authenticate(user=self.youth_user)
        response = self.client.get(f'/api/groups/{closed_group.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
