"""
Celery configuration for async task processing.

This allows emails and other time-consuming tasks to run in the background
without blocking API requests.

Usage:
    # Start Celery worker:
    celery -A core worker -l info

    # In production with multiple workers:
    celery -A core worker -l info --concurrency=4

    # Optional: Start Flower for monitoring:
    celery -A core flower
"""
import os
from celery import Celery

# Set default Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Create Celery app
app = Celery('the_youth_app')

# Load config from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery setup"""
    print(f'Request: {self.request!r}')


