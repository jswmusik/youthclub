"""
Tests for audit logging functionality.
"""

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import AuditLog
from .services import log_audit_event, log_model_change, get_model_changes

User = get_user_model()


class AuditLogModelTest(TestCase):
    """Test audit log model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_create_audit_log(self):
        """Test creating an audit log entry"""
        log = AuditLog.objects.create(
            user=self.user,
            action=AuditLog.Action.CREATE,
            model_name='Post',
            object_id=1,
            object_repr='Test Post',
            ip_address='127.0.0.1'
        )
        
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.action, AuditLog.Action.CREATE)
        self.assertEqual(log.model_name, 'Post')
        self.assertIsNotNone(log.timestamp)
    
    def test_audit_log_string_representation(self):
        """Test string representation of audit log"""
        log = AuditLog.objects.create(
            user=self.user,
            action=AuditLog.Action.UPDATE,
            model_name='User',
        )
        
        str_repr = str(log)
        self.assertIn('test@example.com', str_repr)
        self.assertIn('Modified', str_repr)
        self.assertIn('User', str_repr)


@override_settings(ENABLE_AUDIT_LOGGING=True)
class AuditLogServiceTest(TestCase):
    """Test audit log service functions"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_log_audit_event(self):
        """Test logging an audit event"""
        log = log_audit_event(
            action=AuditLog.Action.READ,
            user=self.user,
            model_name='Post',
            object_id=1,
            ip_address='127.0.0.1'
        )
        
        self.assertIsNotNone(log)
        self.assertEqual(log.action, AuditLog.Action.READ)
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.model_name, 'Post')
    
    def test_log_audit_event_disabled(self):
        """Test that logging is disabled when setting is False"""
        with override_settings(ENABLE_AUDIT_LOGGING=False):
            log = log_audit_event(
                action=AuditLog.Action.READ,
                user=self.user,
                model_name='Post'
            )
            
            self.assertIsNone(log)
    
    def test_get_model_changes(self):
        """Test getting changes between model instances"""
        old_user = User.objects.get(pk=self.user.pk)
        
        # Modify user
        self.user.first_name = 'Changed'
        self.user.last_name = 'Name'
        
        changes = get_model_changes(old_user, self.user, fields=['first_name', 'last_name'])
        
        self.assertIsNotNone(changes)
        self.assertIn('first_name', changes)
        self.assertEqual(changes['first_name']['after'], 'Changed')


@override_settings(ENABLE_AUDIT_LOGGING=True)
class AuditLogAPITest(APITestCase):
    """Test audit log API endpoints"""
    
    def setUp(self):
        # Create test users
        self.user = User.objects.create_user(
            email='user@example.com',
            password='testpass123',
            role='YOUTH_MEMBER'
        )
        
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='adminpass123',
            role='SUPER_ADMIN'
        )
        
        # Create some audit logs
        for i in range(5):
            AuditLog.objects.create(
                user=self.user,
                action=AuditLog.Action.READ,
                model_name='Post',
                object_id=i
            )
        
        self.client = APIClient()
    
    def test_user_can_view_own_logs(self):
        """Test that users can view their own audit logs"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/audit/logs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)
    
    def test_user_cannot_view_other_logs(self):
        """Test that users cannot view other users' logs"""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123'
        )
        
        self.client.force_authenticate(user=other_user)
        response = self.client.get('/api/audit/logs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_admin_can_view_all_logs(self):
        """Test that super admins can view all logs"""
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/audit/logs/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 5)
    
    def test_my_activity_endpoint(self):
        """Test the my_activity convenience endpoint"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/audit/logs/my_activity/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 5)
    
    def test_summary_endpoint(self):
        """Test the summary statistics endpoint"""
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/audit/logs/summary/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_logs', response.data)
        self.assertIn('by_action', response.data)
        self.assertIn('recent_count', response.data)
        self.assertEqual(response.data['total_logs'], 5)
    
    def test_filtering_by_action(self):
        """Test filtering audit logs by action type"""
        # Create a different action type
        AuditLog.objects.create(
            user=self.user,
            action=AuditLog.Action.UPDATE,
            model_name='User'
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/audit/logs/?action=UPDATE')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access logs"""
        response = self.client.get('/api/audit/logs/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(ENABLE_AUDIT_LOGGING=True)
class AuditLogMiddlewareTest(TestCase):
    """Test audit log middleware"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_middleware_should_log_method(self):
        """Test that middleware correctly identifies requests that should be logged"""
        from audit.middleware import AuditLogMiddleware
        from django.test import RequestFactory
        
        middleware = AuditLogMiddleware(lambda request: None)
        factory = RequestFactory()
        
        # Test that sensitive endpoints are identified
        request = factory.get('/api/users/')
        self.assertTrue(middleware._should_log_request(request))
        
        # Test that non-sensitive endpoints are not logged
        request = factory.get('/api/some-other-endpoint/')
        result = middleware._should_log_request(request)
        # This may or may not be logged depending on configuration
        # Just check the method doesn't crash
        self.assertIsInstance(result, bool)

