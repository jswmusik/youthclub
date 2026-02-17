import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure--=9kkpv))f8u^_0()806)3=3%8!d3(_185s!x2(&lz*3h#5$sj'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.50.44', '217.211.65.86', '192.168.1.208']


# Application definition

INSTALLED_APPS = [
    'daphne',  # ASGI server for Django Channels - must be first
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'djoser',
    'channels',  # Django Channels for WebSocket support
    'django_apscheduler',  # Scheduled tasks
    # Core app with image optimization signals
    'core.apps.CoreConfig',
    'users',
    'api',
    'organization',
    'system_messages',
    'news',
    'custom_fields',
    'groups',
    'rewards',
    'posts',
    'notifications',
    'visits',
    'inventory',
    'questionnaires',
    'bookings',
    'events',
    'messenger',
    'learning',
    'marketing',
    'cms',
    'analytics',
    'licensing',
    'emails',
    'seo',
    'audit',  # GDPR audit logging
    'gdpr',   # GDPR data export and compliance
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

# --- DJANGO CHANNELS CONFIGURATION ---
# Channel layers for WebSocket communication
# In-memory layer for development (no external dependencies)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}

# For production, use Redis:
# CHANNEL_LAYERS = {
#     "default": {
#         "BACKEND": "channels_redis.core.RedisChannelLayer",
#         "CONFIG": {
#             "hosts": [("127.0.0.1", 6379)],
#         },
#     }
# }


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = 'static/'

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Allow Next.js to talk to Django
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://192.168.50.44:3000",  # Frontend Port (old IP)
    "http://217.211.65.86:3000",  # Frontend Port (public IP)
    "http://192.168.1.208:3000",  # Frontend Port (local network IP)
]

# Allow credentials (cookies, authorization headers) to be sent
CORS_ALLOW_CREDENTIALS = True

AUTH_USER_MODEL = 'users.User'

# Media files (User uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# --- DRF & AUTH CONFIGURATION ---

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
    # --- PAGINATION ---
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsSetPagination',
    'PAGE_SIZE': 10,  # Default items per page (can be overridden via page_size query param)
    # --- THROTTLING ---
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'user': '10000/hour',  # General rate limit for authenticated users (increased for development)
        'anon': '1000/hour',   # General rate limit for anonymous users (increased for development)
        'message_send': '60/minute',  # Rate limit for sending messages
        'broadcast': '10/minute',     # Rate limit for broadcasts (admin only)
    }
}

from datetime import timedelta

SIMPLE_JWT = {
    # Access tokens are short-lived for security - will be auto-refreshed by frontend
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    # Refresh tokens last 30 days for "Remember Me" functionality
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    # Rotate refresh tokens on each use for added security
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,  # Set to True if using token blacklist app
    'AUTH_HEADER_TYPES': ('JWT',),
    'UPDATE_LAST_LOGIN': True,
}

DJOSER = {
    'LOGIN_FIELD': 'email',
    'USER_CREATE_PASSWORD_RETYPE': True,
    # Password Reset Configuration
    'PASSWORD_RESET_CONFIRM_URL': 'reset-password/{uid}/{token}',
    'PASSWORD_RESET_SHOW_EMAIL_NOT_FOUND': False,  # Security: don't reveal if email exists
    'SEND_ACTIVATION_EMAIL': False,
    'EMAIL': {
        'password_reset': 'emails.djoser_emails.PasswordResetEmail',
    },
    'SERIALIZERS': {
        'user_create': 'djoser.serializers.UserCreateSerializer',
        'user': 'users.serializers.CustomUserSerializer',
        'current_user': 'users.serializers.CustomUserSerializer',
    },
}

# Frontend URL for password reset links
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

# --- APSCHEDULER CONFIGURATION ---
# Format: "HH:MM" in 24-hour time (server timezone)
APSCHEDULER_DATETIME_FORMAT = "N j, Y, f:s a"
APSCHEDULER_RUN_NOW_TIMEOUT = 25  # Seconds

# Scheduler settings
SCHEDULER_CONFIG = {
    "apscheduler.jobstores.default": {
        "class": "django_apscheduler.jobstores:DjangoJobStore"
    },
    "apscheduler.executors.default": {
        "class": "apscheduler.executors.pool:ThreadPoolExecutor",
        "max_workers": "5"
    },
    "apscheduler.job_defaults.coalesce": "true",
    "apscheduler.job_defaults.max_instances": "1",
}

# --- EMAIL CONFIGURATION ---
# 
# DEVELOPMENT OPTIONS (set EMAIL_BACKEND in .env):
# ------------------------------------------------
# 1. Console (default) - Prints emails to terminal
#    EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
#
# 2. File - Saves emails as .eml files in /backend/sent_emails/
#    EMAIL_BACKEND=django.core.mail.backends.filebased.EmailBackend
#
# 3. Mailtrap (recommended for testing) - Free fake SMTP inbox
#    EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
#    EMAIL_HOST=sandbox.smtp.mailtrap.io
#    EMAIL_PORT=2525
#    EMAIL_HOST_USER=<your-mailtrap-username>
#    EMAIL_HOST_PASSWORD=<your-mailtrap-password>
#    Sign up free at: https://mailtrap.io
#
# 4. Gmail (for real emails in dev)
#    EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
#    EMAIL_HOST=smtp.gmail.com
#    EMAIL_PORT=587
#    EMAIL_HOST_USER=your-email@gmail.com
#    EMAIL_HOST_PASSWORD=<app-password>  (NOT your regular password!)
#    Create app password: https://myaccount.google.com/apppasswords
#
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')

# File backend settings (saves to sent_emails folder)
EMAIL_FILE_PATH = os.path.join(BASE_DIR, 'sent_emails')

# SMTP Settings
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.example.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'Ungdomsappen <noreply@ungdomsappen.se>')

# App-specific email settings
EMAIL_SUBJECT_PREFIX = '[Ungdomsappen] '

# ============================================================================
# CELERY CONFIGURATION - Async Task Processing
# ============================================================================
# Celery allows tasks like sending emails to run in the background,
# so API requests return instantly instead of waiting for emails to send.
#
# DEVELOPMENT: 
#   - CELERY_TASK_ALWAYS_EAGER=True (default) - Tasks run synchronously
#   - No need to start Celery worker or Redis
#   - Emails send immediately but block the request
#
# PRODUCTION:
#   - CELERY_TASK_ALWAYS_EAGER=False - Tasks run asynchronously in background
#   - Requires Redis and Celery worker to be running
#   - Emails send in background, API returns instantly
#
# To enable async (in production or testing):
#   1. Install Redis: brew install redis (Mac) or apt install redis (Linux)
#   2. Start Redis: redis-server
#   3. Start Celery worker: celery -A core worker -l info
#   4. Set CELERY_TASK_ALWAYS_EAGER=False in .env

# Redis connection (message broker)
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')

# Store task results in Redis (optional, useful for debugging)
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0')

# Run tasks synchronously in development (no Redis/Celery worker needed)
# Set to False in production for true async behavior
CELERY_TASK_ALWAYS_EAGER = os.getenv('CELERY_TASK_ALWAYS_EAGER', 'True').lower() == 'true'

# If running synchronously, propagate exceptions for easier debugging
CELERY_TASK_EAGER_PROPAGATES = True

# Serialization formats
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TIMEZONE = 'Europe/Stockholm'

# Task execution settings
CELERY_TASK_TIME_LIMIT = 300  # 5 minutes max per task
CELERY_TASK_SOFT_TIME_LIMIT = 240  # Warn at 4 minutes
CELERY_TASK_ACKS_LATE = True  # Only ack tasks after completion (safer)
CELERY_WORKER_PREFETCH_MULTIPLIER = 1  # Take one task at a time

# Retry policy for failed tasks
CELERY_TASK_DEFAULT_RETRY_DELAY = 60  # Wait 1 minute before retry
CELERY_TASK_MAX_RETRIES = 3  # Retry failed tasks up to 3 times

# Optional: Monitor tasks with Flower
# Start with: celery -A core flower
# Access at: http://localhost:5555

# ============================================================================
# GDPR & COMPLIANCE SETTINGS
# ============================================================================

# Audit Logging
# Enable comprehensive audit logging for GDPR compliance
# Set to False to disable (for development or if causing issues)
ENABLE_AUDIT_LOGGING = os.getenv('ENABLE_AUDIT_LOGGING', 'False').lower() == 'true'

# Data Export
# Enable user data export functionality (GDPR Article 20)
ENABLE_DATA_EXPORT = os.getenv('ENABLE_DATA_EXPORT', 'False').lower() == 'true'

# Consent Management
# Enable consent tracking and management
ENABLE_CONSENT_TRACKING = os.getenv('ENABLE_CONSENT_TRACKING', 'True').lower() == 'true'  # Enabled by default for compliance

# Account Deletion
# Enable account deletion (right to erasure)
ENABLE_ACCOUNT_DELETION = os.getenv('ENABLE_ACCOUNT_DELETION', 'True').lower() == 'true'  # Enabled by default for compliance
GDPR_ACCOUNT_DELETION_GRACE_PERIOD_DAYS = int(os.getenv('GDPR_ACCOUNT_DELETION_GRACE_PERIOD_DAYS', 30))  # 30 days grace period

# Account Deletion
# Enable self-service account deletion (GDPR Article 17)
ENABLE_ACCOUNT_DELETION = os.getenv('ENABLE_ACCOUNT_DELETION', 'False').lower() == 'true'

# Audit Log Retention
# How long to keep audit logs before archiving (days)
AUDIT_LOG_RETENTION_DAYS = int(os.getenv('AUDIT_LOG_RETENTION_DAYS', '365'))  # 1 year

# Data Export Settings
# Maximum file size for data exports (MB)
DATA_EXPORT_MAX_SIZE_MB = int(os.getenv('DATA_EXPORT_MAX_SIZE_MB', '100'))

# Data Export Rate Limiting
# Minimum hours between data export requests
DATA_EXPORT_COOLDOWN_HOURS = int(os.getenv('DATA_EXPORT_COOLDOWN_HOURS', '24'))

# Account Deletion Grace Period
# Days before account is actually deleted (allows cancellation)
ACCOUNT_DELETION_GRACE_PERIOD_DAYS = int(os.getenv('ACCOUNT_DELETION_GRACE_PERIOD_DAYS', '14'))