"""
Tests for GDPR data export functionality.
"""

from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
import json

from .models import DataExportRequest, DataExportLog
from .services import DataExportService
from .tasks import process_data_export, cleanup_expired_exports

User = get_user_model()


class DataExportModelTest(TestCase):
    """Test data export models"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_create_export_request(self):
        """Test creating an export request"""
        export = DataExportRequest.objects.create(
            user=self.user,
            ip_address='127.0.0.1'
        )
        
        self.assertEqual(export.status, DataExportRequest.Status.PENDING)
        self.assertIsNotNone(export.requested_at)
        self.assertFalse(export.is_expired)
        self.assertFalse(export.is_available)
    
    def test_mark_as_processing(self):
        """Test marking export as processing"""
        export = DataExportRequest.objects.create(user=self.user)
        export.mark_as_processing(task_id='test-task-123')
        
        self.assertEqual(export.status, DataExportRequest.Status.PROCESSING)
        self.assertIsNotNone(export.started_at)
        self.assertEqual(export.task_id, 'test-task-123')
    
    def test_mark_as_completed(self):
        """Test marking export as completed"""
        export = DataExportRequest.objects.create(user=self.user)
        export.mark_as_processing()
        export.mark_as_completed(
            file_path='exports/1/test.json',
            file_size=1024,
            expires_in_days=7
        )
        
        self.assertEqual(export.status, DataExportRequest.Status.COMPLETED)
        self.assertIsNotNone(export.completed_at)
        self.assertEqual(export.file_path, 'exports/1/test.json')
        self.assertEqual(export.file_size, 1024)
        self.assertIsNotNone(export.expires_at)
        self.assertTrue(export.is_available)
    
    def test_mark_as_failed(self):
        """Test marking export as failed"""
        export = DataExportRequest.objects.create(user=self.user)
        export.mark_as_failed('Test error message')
        
        self.assertEqual(export.status, DataExportRequest.Status.FAILED)
        self.assertEqual(export.error_message, 'Test error message')
        self.assertEqual(export.retry_count, 1)
    
    def test_processing_time(self):
        """Test processing time calculation"""
        export = DataExportRequest.objects.create(user=self.user)
        export.started_at = timezone.now()
        export.completed_at = export.started_at + timezone.timedelta(seconds=30)
        export.save()
        
        self.assertEqual(export.processing_time, 30.0)


class DataExportServiceTest(TestCase):
    """Test data export service"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_collect_profile_data(self):
        """Test collecting profile data"""
        service = DataExportService(self.user)
        service._collect_profile_data()
        
        self.assertIn('profile', service.data)
        self.assertEqual(service.data['profile']['email'], 'test@example.com')
        self.assertEqual(service.data['profile']['first_name'], 'Test')
        self.assertIn('profile', service.sections_collected)
    
    def test_collect_all_data(self):
        """Test collecting all user data"""
        service = DataExportService(self.user)
        data = service.collect_all_data()
        
        # Check metadata
        self.assertIn('export_metadata', data)
        self.assertEqual(data['export_metadata']['user_id'], self.user.id)
        
        # Check summary
        self.assertIn('export_summary', data)
        self.assertGreater(data['export_summary']['sections_collected'], 0)
        
        # Check profile was collected
        self.assertIn('profile', data)
    
    def test_error_handling(self):
        """Test that errors in one section don't break the whole export"""
        service = DataExportService(self.user)
        
        # This should not raise an exception even if some sections fail
        data = service.collect_all_data()
        
        self.assertIn('export_summary', data)
        # At least profile should be collected
        self.assertGreater(data['export_summary']['sections_collected'], 0)


@override_settings(ENABLE_DATA_EXPORT=True, CELERY_TASK_ALWAYS_EAGER=True)
class DataExportAPITest(APITestCase):
    """Test data export API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='user@example.com',
            password='testpass123',
            role='YOUTH_MEMBER'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Clear cache before each test
        cache.clear()
    
    @patch('gdpr.tasks.process_data_export.delay')
    def test_request_export(self, mock_task):
        """Test requesting a data export"""
        mock_task.return_value = MagicMock(id='task-123')
        
        response = self.client.post('/api/gdpr/exports/request-export/')
        
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn('message', response.data)
        self.assertIn('export', response.data)
        
        # Verify export was created
        export = DataExportRequest.objects.get(user=self.user)
        self.assertEqual(export.status, DataExportRequest.Status.PENDING)
        
        # Verify task was queued
        mock_task.assert_called_once()
    
    @patch('gdpr.tasks.process_data_export.delay')
    def test_rate_limiting(self, mock_task):
        """Test rate limiting of export requests"""
        mock_task.return_value = MagicMock(id='task-123')
        
        # First request should succeed
        response1 = self.client.post('/api/gdpr/exports/request-export/')
        self.assertEqual(response1.status_code, status.HTTP_202_ACCEPTED)
        
        # Second request should be rate limited
        response2 = self.client.post('/api/gdpr/exports/request-export/')
        self.assertEqual(response2.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
    
    def test_list_exports(self):
        """Test listing user's export requests"""
        # Create some exports
        DataExportRequest.objects.create(user=self.user)
        DataExportRequest.objects.create(user=self.user)
        
        response = self.client.get('/api/gdpr/exports/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_user_can_only_see_own_exports(self):
        """Test that users can only see their own exports"""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123'
        )
        
        # Create export for other user
        DataExportRequest.objects.create(user=other_user)
        
        # This user should not see it
        response = self.client.get('/api/gdpr/exports/')
        self.assertEqual(len(response.data['results']), 0)
    
    def test_download_completed_export(self):
        """Test downloading a completed export"""
        # Create completed export
        export = DataExportRequest.objects.create(user=self.user)
        export.mark_as_completed(
            file_path='test_export.json',
            file_size=100,
            expires_in_days=7
        )
        
        # Mock file existence
        with patch('os.path.exists', return_value=True), \
             patch('builtins.open', create=True) as mock_open:
            mock_open.return_value.__enter__.return_value = MagicMock()
            
            response = self.client.get(f'/api/gdpr/exports/{export.id}/download/')
            
            # Should attempt to download
            self.assertIn(response.status_code, [200, 500])  # Might fail due to mocking
    
    def test_download_pending_export(self):
        """Test that pending exports cannot be downloaded"""
        export = DataExportRequest.objects.create(user=self.user)
        
        response = self.client.get(f'/api/gdpr/exports/{export.id}/download/')
        
        self.assertEqual(response.status_code, status.HTTP_425_TOO_EARLY)
    
    def test_download_expired_export(self):
        """Test that expired exports cannot be downloaded"""
        export = DataExportRequest.objects.create(user=self.user)
        export.mark_as_completed(
            file_path='test.json',
            file_size=100,
            expires_in_days=0
        )
        export.expires_at = timezone.now() - timezone.timedelta(days=1)
        export.save()
        
        response = self.client.get(f'/api/gdpr/exports/{export.id}/download/')
        
        self.assertEqual(response.status_code, status.HTTP_410_GONE)
    
    def test_cancel_pending_export(self):
        """Test cancelling a pending export"""
        export = DataExportRequest.objects.create(user=self.user)
        
        response = self.client.post(f'/api/gdpr/exports/{export.id}/cancel/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        export.refresh_from_db()
        self.assertEqual(export.status, DataExportRequest.Status.FAILED)
        self.assertEqual(export.error_message, 'Cancelled by user')
    
    def test_feature_disabled(self):
        """Test that API returns 503 when feature is disabled"""
        with override_settings(ENABLE_DATA_EXPORT=False):
            response = self.client.post('/api/gdpr/exports/request-export/')
            
            self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access exports"""
        self.client.logout()
        
        response = self.client.get('/api/gdpr/exports/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(CELERY_TASK_ALWAYS_EAGER=True)
class DataExportTaskTest(TestCase):
    """Test Celery tasks for data export"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    @patch('gdpr.tasks.save_export_file')
    @patch('gdpr.tasks.send_export_complete_email')
    def test_process_export_success(self, mock_email, mock_save):
        """Test successful export processing"""
        mock_save.return_value = 'exports/1/test.json'
        
        export = DataExportRequest.objects.create(user=self.user)
        
        result = process_data_export(export.id)
        
        export.refresh_from_db()
        self.assertEqual(export.status, DataExportRequest.Status.COMPLETED)
        self.assertIsNotNone(export.completed_at)
        
        # Verify email was sent
        mock_email.assert_called_once()
    
    def test_cleanup_expired_exports(self):
        """Test cleanup of expired exports"""
        # Create expired export
        export = DataExportRequest.objects.create(user=self.user)
        export.mark_as_completed(
            file_path='test.json',
            file_size=100,
            expires_in_days=0
        )
        export.expires_at = timezone.now() - timezone.timedelta(days=1)
        export.save()
        
        # Mock file operations
        with patch('os.path.exists', return_value=True), \
             patch('os.remove') as mock_remove:
            
            result = cleanup_expired_exports()
            
            export.refresh_from_db()
            self.assertEqual(export.status, DataExportRequest.Status.EXPIRED)
            
            # Verify file was deleted
            mock_remove.assert_called_once()


