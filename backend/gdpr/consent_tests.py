"""
Tests for GDPR consent management.
"""

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch

from .consent_models import ConsentType, UserConsent, ConsentLog
from .consent_service import ConsentService

User = get_user_model()


class ConsentModelTest(TestCase):
    """Test consent models"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        self.consent_type = ConsentType.objects.create(
            code='test_consent',
            name='Test Consent',
            description='Test',
            version='1.0',
            is_required=True,
            consent_text='I agree to test',
            legal_basis='Test basis'
        )
    
    def test_create_consent_type(self):
        """Test creating a consent type"""
        self.assertEqual(self.consent_type.code, 'test_consent')
        self.assertTrue(self.consent_type.is_active)
        self.assertTrue(self.consent_type.is_required)
    
    def test_create_user_consent(self):
        """Test creating a user consent"""
        user_consent = UserConsent.objects.create(
            user=self.user,
            consent_type=self.consent_type,
            consent_method='REGISTRATION',
            consent_text_snapshot=self.consent_type.consent_text,
            version_snapshot=self.consent_type.version
        )
        
        self.assertTrue(user_consent.is_active)
        self.assertEqual(user_consent.version_snapshot, '1.0')
        self.assertTrue(user_consent.is_current_version)
    
    def test_withdraw_consent(self):
        """Test withdrawing consent"""
        user_consent = UserConsent.objects.create(
            user=self.user,
            consent_type=self.consent_type,
            consent_text_snapshot=self.consent_type.consent_text,
            version_snapshot=self.consent_type.version
        )
        
        user_consent.withdraw(reason='Test withdrawal', ip_address='127.0.0.1')
        
        self.assertFalse(user_consent.is_active)
        self.assertIsNotNone(user_consent.withdrawn_at)
        self.assertEqual(user_consent.withdrawal_reason, 'Test withdrawal')
    
    def test_needs_update_when_version_changes(self):
        """Test that consent needs update when version changes"""
        user_consent = UserConsent.objects.create(
            user=self.user,
            consent_type=self.consent_type,
            consent_text_snapshot=self.consent_type.consent_text,
            version_snapshot='1.0'
        )
        
        # Update consent type version
        self.consent_type.version = '2.0'
        self.consent_type.save()
        
        # Refresh from database
        user_consent.refresh_from_db()
        
        self.assertTrue(user_consent.needs_update)
        self.assertFalse(user_consent.is_current_version)
    
    def test_unique_active_consent_constraint(self):
        """Test that users cannot have duplicate active consents"""
        UserConsent.objects.create(
            user=self.user,
            consent_type=self.consent_type,
            consent_text_snapshot=self.consent_type.consent_text,
            version_snapshot=self.consent_type.version
        )
        
        # Try to create duplicate active consent
        from django.db import IntegrityError
        with self.assertRaises(IntegrityError):
            UserConsent.objects.create(
                user=self.user,
                consent_type=self.consent_type,
                consent_text_snapshot=self.consent_type.consent_text,
                version_snapshot=self.consent_type.version
            )


class ConsentServiceTest(TestCase):
    """Test consent service functions"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        
        self.required_consent = ConsentType.objects.create(
            code='required_test',
            name='Required Test',
            description='Required consent',
            version='1.0',
            is_required=True,
            consent_text='I agree',
            legal_basis='Test'
        )
        
        self.optional_consent = ConsentType.objects.create(
            code='optional_test',
            name='Optional Test',
            description='Optional consent',
            version='1.0',
            is_required=False,
            consent_text='I opt in',
            legal_basis='Test'
        )
    
    def test_record_consent(self):
        """Test recording a consent"""
        consent = ConsentService.record_consent(
            user=self.user,
            consent_code='required_test',
            consent_method='REGISTRATION',
            ip_address='127.0.0.1'
        )
        
        self.assertIsNotNone(consent)
        self.assertEqual(consent.user, self.user)
        self.assertTrue(consent.is_active)
        
        # Check log was created
        self.assertEqual(consent.logs.count(), 1)
        log = consent.logs.first()
        self.assertEqual(log.event_type, 'GIVEN')
    
    def test_withdraw_consent(self):
        """Test withdrawing a consent"""
        # First record consent
        ConsentService.record_consent(
            user=self.user,
            consent_code='optional_test'
        )
        
        # Then withdraw
        success = ConsentService.withdraw_consent(
            user=self.user,
            consent_code='optional_test',
            reason='No longer interested'
        )
        
        self.assertTrue(success)
        
        # Check consent is withdrawn
        self.assertFalse(ConsentService.has_consent(self.user, 'optional_test'))
    
    def test_has_consent(self):
        """Test checking consent status"""
        # User doesn't have consent yet
        self.assertFalse(ConsentService.has_consent(self.user, 'required_test'))
        
        # Record consent
        ConsentService.record_consent(
            user=self.user,
            consent_code='required_test'
        )
        
        # Now user has consent
        self.assertTrue(ConsentService.has_consent(self.user, 'required_test'))
    
    def test_get_required_consents(self):
        """Test getting required consents"""
        required = ConsentService.get_required_consents()
        
        self.assertEqual(len(required), 1)
        self.assertEqual(required[0].code, 'required_test')
    
    def test_get_optional_consents(self):
        """Test getting optional consents"""
        optional = ConsentService.get_optional_consents()
        
        self.assertEqual(len(optional), 1)
        self.assertEqual(optional[0].code, 'optional_test')
    
    def test_record_bulk_consents(self):
        """Test recording multiple consents at once"""
        results = ConsentService.record_bulk_consents(
            user=self.user,
            consent_codes=['required_test', 'optional_test'],
            consent_method='REGISTRATION'
        )
        
        self.assertTrue(results['required_test'])
        self.assertTrue(results['optional_test'])
        
        # Check both consents were recorded
        self.assertTrue(ConsentService.has_consent(self.user, 'required_test'))
        self.assertTrue(ConsentService.has_consent(self.user, 'optional_test'))
    
    def test_check_registration_consents(self):
        """Test validating registration consents"""
        # Missing required consent
        validation = ConsentService.check_registration_consents(['optional_test'])
        self.assertFalse(validation['valid'])
        self.assertIn('required_test', validation['missing_required'])
        
        # All required consents present
        validation = ConsentService.check_registration_consents(['required_test', 'optional_test'])
        self.assertTrue(validation['valid'])
        self.assertEqual(len(validation['missing_required']), 0)
    
    def test_get_consents_needing_update(self):
        """Test finding outdated consents"""
        # Record consent with current version
        ConsentService.record_consent(
            user=self.user,
            consent_code='required_test'
        )
        
        # No outdated consents yet
        outdated = ConsentService.get_consents_needing_update(self.user)
        self.assertEqual(len(outdated), 0)
        
        # Update consent type version
        self.required_consent.version = '2.0'
        self.required_consent.save()
        
        # Now consent is outdated
        outdated = ConsentService.get_consents_needing_update(self.user)
        self.assertEqual(len(outdated), 1)


@override_settings(ENABLE_CONSENT_TRACKING=True)
class ConsentAPITest(APITestCase):
    """Test consent API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='user@example.com',
            password='testpass123'
        )
        
        self.consent_type = ConsentType.objects.create(
            code='test_consent',
            name='Test Consent',
            description='Test consent type',
            version='1.0',
            is_required=False,
            consent_text='I agree to test',
            legal_basis='Test'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_list_consent_types(self):
        """Test listing available consent types"""
        response = self.client.get('/api/gdpr/consent-types/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_give_consent(self):
        """Test giving consent via API"""
        response = self.client.post('/api/gdpr/my-consents/give/', {
            'consent_code': 'test_consent'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('consent', response.data)
        
        # Verify consent was recorded
        self.assertTrue(ConsentService.has_consent(self.user, 'test_consent'))
    
    def test_withdraw_consent(self):
        """Test withdrawing consent via API"""
        # First give consent
        ConsentService.record_consent(
            user=self.user,
            consent_code='test_consent'
        )
        
        # Then withdraw
        response = self.client.post('/api/gdpr/my-consents/withdraw/', {
            'consent_code': 'test_consent',
            'reason': 'Test withdrawal'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify consent was withdrawn
        self.assertFalse(ConsentService.has_consent(self.user, 'test_consent'))
    
    def test_list_user_consents(self):
        """Test listing user's consents"""
        ConsentService.record_consent(
            user=self.user,
            consent_code='test_consent'
        )
        
        response = self.client.get('/api/gdpr/my-consents/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_check_consent_status(self):
        """Test checking consent status"""
        ConsentService.record_consent(
            user=self.user,
            consent_code='test_consent'
        )
        
        response = self.client.get('/api/gdpr/my-consents/check/?codes=test_consent')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['consents']['test_consent'])
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access consents"""
        self.client.logout()
        
        response = self.client.get('/api/gdpr/my-consents/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


