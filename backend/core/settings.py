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
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'djoser',
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