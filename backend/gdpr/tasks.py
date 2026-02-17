"""
Celery tasks for GDPR data export processing.
"""

import json
import logging
import os
from celery import shared_task
from django.contrib.auth import get_user_model
from django.conf import settings
from django.utils import timezone
from django.core.files.base import ContentFile

from .models import DataExportRequest, DataExportLog
from .services import DataExportService
from emails.tasks import send_email_async

User = get_user_model()
logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    soft_time_limit=600,  # 10 minutes
    time_limit=900        # 15 minutes hard limit
)
def process_data_export(self, export_request_id):
    """
    Process a data export request.
    
    This task:
    1. Collects all user data
    2. Saves it as a JSON file
    3. Uploads to storage (S3 or local)
    4. Sends email notification
    5. Updates export request status
    
    Args:
        export_request_id: ID of the DataExportRequest
    """
    try:
        # Get the export request
        export_request = DataExportRequest.objects.select_related('user').get(
            id=export_request_id
        )
        
        # Mark as processing
        export_request.mark_as_processing(task_id=self.request.id)
        
        logger.info(f"Starting data export for user {export_request.user.id}")
        
        # Collect data
        service = DataExportService(export_request.user)
        data = service.collect_all_data()
        
        # Log what was collected
        for section in service.sections_collected:
            DataExportLog.objects.create(
                export_request=export_request,
                section=section,
                record_count=len(data.get(section, {}).get('items', [])) if isinstance(data.get(section), dict) else 0,
                status='SUCCESS'
            )
        
        for section_error in service.sections_failed:
            section_name = section_error.split(':')[0]
            error_msg = section_error.split(':', 1)[1] if ':' in section_error else 'Unknown error'
            DataExportLog.objects.create(
                export_request=export_request,
                section=section_name,
                status='ERROR',
                error_message=error_msg
            )
        
        # Convert to JSON
        json_data = json.dumps(data, indent=2, ensure_ascii=False)
        file_size = len(json_data.encode('utf-8'))
        
        # Check max size (default 100MB)
        max_size_mb = getattr(settings, 'DATA_EXPORT_MAX_SIZE_MB', 100)
        max_size_bytes = max_size_mb * 1024 * 1024
        
        if file_size > max_size_bytes:
            raise Exception(f"Export file too large: {file_size} bytes (max: {max_size_bytes})")
        
        # Save file
        filename = f"data_export_{export_request.user.id}_{int(timezone.now().timestamp())}.json"
        file_path = save_export_file(filename, json_data, export_request.user)
        
        # Mark as completed
        export_request.mark_as_completed(
            file_path=file_path,
            file_size=file_size,
            expires_in_days=7
        )
        
        logger.info(f"Data export completed for user {export_request.user.id}. "
                   f"File: {file_path}, Size: {file_size} bytes")
        
        # Send email notification
        send_export_complete_email(export_request)
        
        return {
            'status': 'completed',
            'file_path': file_path,
            'file_size': file_size,
            'sections_collected': len(service.sections_collected),
            'sections_failed': len(service.sections_failed)
        }
        
    except DataExportRequest.DoesNotExist:
        logger.error(f"Export request {export_request_id} not found")
        raise
    
    except Exception as e:
        logger.error(f"Data export failed for request {export_request_id}: {e}", exc_info=True)
        
        # Mark as failed
        try:
            export_request = DataExportRequest.objects.get(id=export_request_id)
            export_request.mark_as_failed(str(e))
            
            # Send failure email
            send_export_failed_email(export_request)
        except:
            pass
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))
        
        raise


def save_export_file(filename, content, user):
    """
    Save export file to storage.
    
    In development: saves to media/exports/
    In production: uploads to S3 (if configured)
    
    Args:
        filename: Name of the file
        content: File content (string)
        user: User who requested the export
    
    Returns:
        File path or URL
    """
    # For now, save locally to media/exports/
    # In production, this should upload to S3
    
    export_dir = os.path.join(settings.MEDIA_ROOT, 'exports', str(user.id))
    os.makedirs(export_dir, exist_ok=True)
    
    file_path = os.path.join(export_dir, filename)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Return relative path
    relative_path = os.path.join('exports', str(user.id), filename)
    
    logger.info(f"Export file saved: {relative_path}")
    
    return relative_path


def send_export_complete_email(export_request):
    """
    Send email notification when export is complete.
    
    Args:
        export_request: DataExportRequest instance
    """
    user = export_request.user
    
    # Generate download URL
    download_url = f"{settings.FRONTEND_URL}/settings/privacy/download-data/{export_request.id}"
    
    # Calculate expiry
    expires_in_days = (export_request.expires_at - timezone.now()).days if export_request.expires_at else 7
    
    # Send email (send_email_async is a helper function, not a Celery task)
    # Pass recipient user object for proper language detection
    send_email_async(
        template_type='data_export_ready',
        recipient=user,
        context={
            'first_name': user.first_name,
            'download_url': download_url,
            'file_size_mb': round(export_request.file_size / (1024 * 1024), 2),
            'expires_in_days': expires_in_days,
            'requested_at': export_request.requested_at.strftime('%Y-%m-%d %H:%M'),
        }
    )
    
    logger.info(f"Export complete email sent to {user.email}")


def send_export_failed_email(export_request):
    """
    Send email notification when export fails.
    
    Args:
        export_request: DataExportRequest instance
    """
    user = export_request.user
    
    # Pass recipient user object for proper language detection
    send_email_async(
        template_type='data_export_failed',
        recipient=user,
        context={
            'first_name': user.first_name,
            'support_email': settings.DEFAULT_FROM_EMAIL,
        }
    )
    
    logger.info(f"Export failed email sent to {user.email}")


@shared_task
def cleanup_expired_exports():
    """
    Clean up expired data export files.
    
    This task should be run daily to remove files that have expired.
    Files are kept for 7 days after export completion.
    """
    try:
        # Find expired exports
        expired_exports = DataExportRequest.objects.filter(
            status=DataExportRequest.Status.COMPLETED,
            expires_at__lt=timezone.now()
        )
        
        count = 0
        for export_request in expired_exports:
            try:
                # Delete file
                if export_request.file_path:
                    file_path = os.path.join(settings.MEDIA_ROOT, export_request.file_path)
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        logger.info(f"Deleted expired export file: {export_request.file_path}")
                
                # Mark as expired
                export_request.mark_as_expired()
                count += 1
                
            except Exception as e:
                logger.error(f"Failed to clean up export {export_request.id}: {e}")
        
        logger.info(f"Cleaned up {count} expired exports")
        return {'cleaned_up': count}
        
    except Exception as e:
        logger.error(f"Failed to cleanup expired exports: {e}", exc_info=True)
        raise

