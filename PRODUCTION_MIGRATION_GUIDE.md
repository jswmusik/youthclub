# Production Migration Guide - Ungdomsappen
## Scaling to 60,000+ Users

**Last Updated**: January 2026  
**Target Scale**: 60,000 members, 5,000 concurrent users  
**Current Status**: Development (SQLite)  
**Target Status**: Production-ready (PostgreSQL + Redis + Cloud Storage)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture Issues](#current-architecture-issues)
3. [Target Architecture](#target-architecture)
4. [Migration Phases](#migration-phases)
5. [Detailed Implementation Steps](#detailed-implementation-steps)
6. [Configuration Examples](#configuration-examples)
7. [Testing & Validation](#testing--validation)
8. [Cost Estimates](#cost-estimates)
9. [GDPR & Compliance](#gdpr--compliance)
10. [Complete Checklists](#complete-checklists)

---

## Executive Summary

### Why This Migration is Critical

With **60,000 members** and **high daily traffic**, the current SQLite-based development setup will **fail in production**. This guide provides a step-by-step plan to migrate to a production-ready, scalable architecture.

### Key Changes Required

| Component | Current | Production | Priority |
|-----------|---------|------------|----------|
| Database | SQLite | PostgreSQL + Replicas | 🔴 CRITICAL |
| Caching | None | Redis (multi-instance) | 🔴 CRITICAL |
| File Storage | Local `/media/` | S3/Cloud + CDN | 🔴 CRITICAL |
| WebSockets | In-memory | Redis Channel Layer | 🔴 CRITICAL |
| App Servers | Single instance | Load-balanced (3+) | 🔴 CRITICAL |
| Task Queue | Sync (slow) | Celery + Redis | 🟡 HIGH |
| Monitoring | None | Full observability | 🟡 HIGH |
| Backups | Manual | Automated daily | 🔴 CRITICAL |

### Timeline Estimate

- **Phase 1 (Critical)**: 2-3 weeks - Core infrastructure
- **Phase 2 (Important)**: 2-3 weeks - Optimization & monitoring
- **Phase 3 (Enhancement)**: Ongoing - Continuous improvement

### Budget Estimate

- **Swedish Provider (Recommended)**: 5,000-10,000 SEK/month
- **International (AWS Stockholm)**: 10,000-13,000 SEK/month

---

## Current Architecture Issues

### 🔴 Critical Issues (Will Cause Failures)

#### 1. SQLite Database
**Problem**: 
- SQLite is a file-based database designed for low-concurrency applications
- Maximum ~100 concurrent connections
- Locks entire database for writes
- No replication or redundancy
- Will crash under production load

**Impact with 60K users**:
- Peak load: 5,000 users × 10 requests/min = **50,000 requests/minute**
- SQLite bottleneck: Requests will queue, timeout, or fail
- Database corruption risk under heavy concurrent writes
- No recovery from hardware failure

**Evidence**:
```python
# Current settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',  # ❌ NOT production-ready
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

#### 2. No Caching Layer
**Problem**:
- Every request hits the database
- Expensive queries run repeatedly
- User profile, posts, events fetched fresh every time

**Impact**:
- Slow response times (2-5 seconds per request)
- Database overload (will max out connections)
- Poor user experience
- Server crashes

**Current State**:
- Only 1 view (`PublicKPIView`) has caching
- 99% of endpoints have no caching

#### 3. Local File Storage
**Problem**:
- 60,000 users × 5 images each = 300,000 images
- ~500KB per image = **150GB minimum**
- No redundancy (disk failure = data loss)
- No CDN (slow loading from single server)
- Backups are complex and slow

**Impact**:
- Disk space will run out
- Slow image loading (especially internationally)
- Server downtime affects image availability
- Expensive bandwidth costs

#### 4. In-Memory Channel Layer (WebSockets)
**Problem**:
- Only works on single server
- Lost on server restart
- Cannot scale horizontally

**Impact**:
- Real-time messaging won't work across multiple servers
- Lost messages on deployment
- Cannot handle 5,000+ concurrent WebSocket connections

#### 5. No Database Indexes
**Problem**:
- Queries on unindexed fields cause full table scans
- With millions of records, queries take 10-30 seconds

**Impact**:
- Very slow list views
- Timeouts and errors
- Database CPU at 100%

### 🟡 High Priority Issues

#### 6. No Monitoring or Alerting
- Cannot detect problems until users complain
- No visibility into performance bottlenecks
- Cannot track error rates or slow queries

#### 7. No Automated Backups
- Manual backups are unreliable
- No point-in-time recovery
- Risk of data loss

#### 8. Hardcoded Secrets
```python
SECRET_KEY = 'django-insecure--=9kkpv))f8u^_0()806)3=3%8!d3(_185s!x2(&lz*3h#5$sj'
DEBUG = True
```
- Security vulnerability
- Cannot deploy safely

#### 9. Wrong Timezone
```python
TIME_ZONE = 'UTC'  # Should be 'Europe/Stockholm'
```
- Affects scheduled jobs
- Confusing timestamps for Swedish users

---

## Target Architecture

### Infrastructure Diagram

```
                          ┌─────────────────────┐
                          │   LOAD BALANCER     │
                          │   (Nginx/HAProxy)   │
                          │   SSL Termination   │
                          └──────────┬──────────┘
                                     │
                ┏━━━━━━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━━━━━━┓
                ┃                                          ┃
        ┌───────▼────────┐                        ┌───────▼────────┐
        │ Django Server 1│                        │ Django Server 2│
        │  Gunicorn      │                        │  Gunicorn      │
        │  8-16 workers  │                        │  8-16 workers  │
        └───────┬────────┘                        └───────┬────────┘
                │                                          │
                └──────────────────┬───────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
    ┌────▼──────┐          ┌──────▼──────┐         ┌───────▼──────┐
    │PostgreSQL │          │    Redis    │         │   Celery     │
    │  Primary  │◄────────►│   Cluster   │◄───────►│   Workers    │
    │  +Replica │          │   3 nodes   │         │   (3-5)      │
    └─────┬─────┘          └──────┬──────┘         └──────────────┘
          │                       │
          │                       ├─► Cache (DB 1)
          │                       ├─► Sessions (DB 2)
          │                       ├─► Channels (DB 3)
          │                       └─► Celery (DB 4)
          │
    ┌─────▼──────────────────┐
    │   Backup Storage       │
    │   (Daily Automated)    │
    └────────────────────────┘

    ┌────────────────────────┐
    │   S3/Cloud Storage     │
    │   + CloudFront CDN     │
    │   (Media Files)        │
    └────────────────────────┘

    ┌────────────────────────┐
    │   Monitoring Stack     │
    │   Sentry/DataDog/etc   │
    └────────────────────────┘
```

### Component Specifications

#### Application Servers (3 instances)
- **CPU**: 4 cores per instance
- **RAM**: 8GB per instance
- **OS**: Ubuntu 22.04 LTS or similar
- **Software**: Gunicorn with 8-16 workers
- **Network**: Private subnet, access via load balancer only

#### PostgreSQL Database
- **Type**: Managed service (RDS, Azure Database, or equivalent)
- **Instance**: 4-8 CPU cores, 16-32GB RAM
- **Storage**: 500GB SSD with auto-scaling
- **Backups**: Automated daily, 30-day retention
- **Replication**: 1-2 read replicas for heavy queries
- **Connection Pooling**: PgBouncer or built-in pooling

#### Redis Cluster (2-3 instances)
- **Type**: Managed service (ElastiCache, Azure Cache, or equivalent)
- **Instance**: 2-4 CPU cores, 4-8GB RAM per instance
- **Configuration**: Redis Sentinel or Cluster mode
- **Persistence**: RDB snapshots + AOF for durability
- **Databases**:
  - DB 0: Celery broker
  - DB 1: Application cache
  - DB 2: Session storage
  - DB 3: Django Channels

#### Object Storage
- **Type**: S3-compatible storage (AWS S3, Wasabi, Backblaze B2)
- **Region**: EU (Sweden if possible)
- **Estimated Size**: 200GB (growing)
- **CDN**: CloudFront, Cloudflare, or similar
- **Backup**: Versioning enabled

#### Celery Workers (3-5 instances)
- **CPU**: 2 cores per instance
- **RAM**: 4GB per instance
- **Concurrency**: 4-8 workers per instance
- **Queues**: 
  - `default`: General tasks
  - `email`: Email sending
  - `heavy`: Long-running tasks

---

## Migration Phases

### Phase 1: Critical Infrastructure (2-3 weeks)

**Goal**: Get production-ready database, caching, and storage

**Tasks**:
1. Set up PostgreSQL database
2. Migrate data from SQLite to PostgreSQL
3. Set up Redis for caching and sessions
4. Migrate media files to cloud storage
5. Configure Redis channel layer
6. Add critical database indexes
7. Set up SSL/TLS
8. Configure environment variables

**Success Criteria**:
- All tests pass on PostgreSQL
- Application runs without SQLite
- Images load from cloud storage
- Cache hit rate >70%
- WebSockets work across multiple servers

### Phase 2: Optimization & Reliability (2-3 weeks)

**Goal**: Ensure performance and reliability at scale

**Tasks**:
1. Set up database read replicas
2. Implement comprehensive caching strategy
3. Optimize database queries (add indexes, fix N+1)
4. Set up monitoring and alerting
5. Configure automated backups
6. Load testing with 5,000 concurrent users
7. Implement rate limiting and throttling
8. Set up log aggregation

**Success Criteria**:
- API response time p95 <200ms
- Database can handle >10,000 queries/second
- Monitoring dashboards show all metrics
- Automated backups running daily
- Load test passes without errors

### Phase 3: Production Hardening (Ongoing)

**Goal**: Continuous optimization and security

**Tasks**:
1. Security audit and penetration testing
2. GDPR compliance verification
3. Performance optimization (query tuning, denormalization)
4. CDN optimization
5. Implement A/B testing infrastructure
6. Set up staging environment
7. Document runbooks and procedures
8. Train team on operations

**Success Criteria**:
- Security audit passes
- GDPR compliance documented
- Staging environment mirrors production
- Team trained on incident response

---

## Detailed Implementation Steps

### Step 1: PostgreSQL Setup (Week 1, Day 1-3)

#### 1.1 Provision PostgreSQL Instance

**Recommended Providers**:
- **Swedish**: Safespring, Binero, CloudNordic
- **International**: AWS RDS (Stockholm), Azure Database, Google Cloud SQL

**Minimum Specifications**:
- PostgreSQL 15 or later
- 4 CPU cores, 16GB RAM
- 500GB SSD storage
- Automated backups enabled
- SSL/TLS required
- Private network access

**Configuration Checklist**:
```bash
# PostgreSQL Settings (postgresql.conf)
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
```

#### 1.2 Install Dependencies

```bash
# Add to backend/requirements.txt
psycopg2-binary==2.9.9
django-db-connection-pool==1.2.4
```

```bash
# Install
cd backend
source venv/bin/activate
pip install psycopg2-binary django-db-connection-pool
```

#### 1.3 Update Django Settings

Create production settings file:

```bash
mkdir -p backend/core/settings
touch backend/core/settings/__init__.py
touch backend/core/settings/base.py
touch backend/core/settings/development.py
touch backend/core/settings/production.py
```

**File: backend/core/settings/production.py**

```python
from .base import *
import os

# Security
DEBUG = False
SECRET_KEY = os.environ['DJANGO_SECRET_KEY']
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Database
DATABASES = {
    'default': {
        'ENGINE': 'dj_db_conn_pool.backends.postgresql',
        'NAME': os.environ['DB_NAME'],
        'USER': os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ['DB_HOST'],
        'PORT': os.environ.get('DB_PORT', '5432'),
        'CONN_MAX_AGE': 600,  # 10 minutes
        'OPTIONS': {
            'sslmode': 'require',
            'connect_timeout': 10,
            'options': '-c statement_timeout=30000'  # 30 second timeout
        },
        'POOL_OPTIONS': {
            'POOL_SIZE': 20,
            'MAX_OVERFLOW': 30,
            'TIMEOUT': 30,
            'RECYCLE': 3600,
        },
        'ATOMIC_REQUESTS': True,
    }
}

# Timezone
TIME_ZONE = 'Europe/Stockholm'
USE_TZ = True

# Security Headers
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
```

#### 1.4 Data Migration

```bash
# Step 1: Backup SQLite data
cd backend
python manage.py dumpdata --natural-foreign --natural-primary \
  --exclude contenttypes --exclude auth.Permission \
  > full_backup.json

# Step 2: Update environment variables
export DJANGO_SETTINGS_MODULE=core.settings.production
export DB_NAME=ungdomsappen
export DB_USER=ungdomsappen_user
export DB_PASSWORD="your-secure-password"
export DB_HOST=your-db-host.example.com
export DB_PORT=5432
export DJANGO_SECRET_KEY="your-new-secret-key"

# Step 3: Create tables in PostgreSQL
python manage.py migrate

# Step 4: Load data
python manage.py loaddata full_backup.json

# Step 5: Verify
python manage.py shell
>>> from users.models import User
>>> User.objects.count()
# Should match your SQLite count

# Step 6: Create superuser if needed
python manage.py createsuperuser
```

#### 1.5 Add Database Indexes

Create migration file:

```bash
python manage.py makemigrations --empty users --name add_performance_indexes
```

Edit the migration file:

```python
# backend/users/migrations/XXXX_add_performance_indexes.py
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('users', 'XXXX_previous_migration'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['role', 'is_active'], name='user_role_active_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['assigned_municipality', 'role'], name='user_muni_role_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['preferred_club', 'is_active'], name='user_club_active_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['-last_active_at'], name='user_last_active_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['-date_joined'], name='user_joined_idx'),
        ),
    ]
```

Apply similar migrations for other models:

```bash
# Posts
python manage.py makemigrations --empty posts --name add_performance_indexes

# Events
python manage.py makemigrations --empty events --name add_performance_indexes

# Visits
python manage.py makemigrations --empty visits --name add_performance_indexes

# Apply all
python manage.py migrate
```

---

### Step 2: Redis Setup (Week 1, Day 3-4)

#### 2.1 Provision Redis

**Recommended Setup**:
- Redis 7.x or later
- 2-3 instance cluster with Sentinel
- 4-8GB RAM per instance
- Persistence: RDB + AOF
- Private network access only

#### 2.2 Install Dependencies

```bash
# Add to requirements.txt
django-redis==5.4.0
redis==5.0.1
channels-redis==4.1.0
```

```bash
pip install django-redis redis channels-redis
```

#### 2.3 Configure Redis

**File: backend/core/settings/production.py** (add to existing file)

```python
# Redis Configuration
REDIS_URL = os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379')

# Cache Configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'{REDIS_URL}/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True
            },
            'IGNORE_EXCEPTIONS': True,  # Don't fail if Redis is down
        },
        'KEY_PREFIX': 'ungdomsappen',
        'TIMEOUT': 300,  # 5 minutes default
    },
    'sessions': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': f'{REDIS_URL}/2',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'session',
    },
}

# Use Redis for sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
SESSION_COOKIE_AGE = 1209600  # 2 weeks

# Django Channels - Redis
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [f'{REDIS_URL}/3'],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}

# Celery - Redis
CELERY_BROKER_URL = f'{REDIS_URL}/0'
CELERY_RESULT_BACKEND = f'{REDIS_URL}/0'
CELERY_TASK_ALWAYS_EAGER = False  # Use actual async in production
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Europe/Stockholm'
CELERY_TASK_TIME_LIMIT = 300
CELERY_TASK_SOFT_TIME_LIMIT = 240
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
```

#### 2.4 Implement Caching Strategy

**File: backend/core/cache_utils.py** (create new file)

```python
from django.core.cache import cache
from functools import wraps
import hashlib
import json

def cache_key(*args, **kwargs):
    """Generate cache key from arguments"""
    key_data = json.dumps({'args': args, 'kwargs': kwargs}, sort_keys=True)
    return hashlib.md5(key_data.encode()).hexdigest()

def cached_function(timeout=300, key_prefix='func'):
    """Decorator to cache function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            key = f'{key_prefix}:{cache_key(*args, **kwargs)}'
            
            # Try to get from cache
            result = cache.get(key)
            if result is not None:
                return result
            
            # Calculate and cache
            result = func(*args, **kwargs)
            cache.set(key, result, timeout)
            return result
        return wrapper
    return decorator

def invalidate_cache(key_prefix, *args, **kwargs):
    """Invalidate cached function result"""
    key = f'{key_prefix}:{cache_key(*args, **kwargs)}'
    cache.delete(key)
```

**Apply caching to expensive endpoints**:

```python
# Example: backend/users/views.py
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from core.cache_utils import cached_function

class UserViewSet(viewsets.ModelViewSet):
    # Cache list view for 5 minutes
    @method_decorator(cache_page(60 * 5))
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

# Example: Cache user statistics
@cached_function(timeout=600, key_prefix='user_stats')
def get_user_statistics(user_id):
    # Expensive calculation
    user = User.objects.get(id=user_id)
    return {
        'total_visits': user.visits.count(),
        'total_rewards': user.reward_usages.count(),
        # ... more stats
    }
```

---

### Step 3: Cloud Storage Setup (Week 1-2, Day 5-7)

#### 3.1 Choose Provider

**Recommended Options**:

1. **AWS S3** (Stockholm region: `eu-north-1`)
   - Most mature
   - Excellent CDN (CloudFront)
   - ~$25-50/month for 200GB

2. **Wasabi** (Amsterdam)
   - Cheaper than S3
   - No egress fees
   - ~$6/month for 1TB

3. **Backblaze B2**
   - Very cheap
   - Good for backups
   - Cloudflare CDN integration

#### 3.2 Install Dependencies

```bash
# Add to requirements.txt
django-storages[s3]==1.14
boto3==1.34.22
```

```bash
pip install 'django-storages[s3]' boto3
```

#### 3.3 Configure Storage

**File: backend/core/settings/production.py** (add to existing)

```python
# AWS S3 Configuration
INSTALLED_APPS += ['storages']

# Storage settings
AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
AWS_STORAGE_BUCKET_NAME = os.environ.get('AWS_S3_BUCKET')
AWS_S3_REGION_NAME = os.environ.get('AWS_S3_REGION', 'eu-north-1')
AWS_S3_CUSTOM_DOMAIN = os.environ.get('CDN_DOMAIN', 
                                       f'{AWS_STORAGE_BUCKET_NAME}.s3.amazonaws.com')

# S3 settings
AWS_S3_OBJECT_PARAMETERS = {
    'CacheControl': 'max-age=86400',  # 24 hours
}
AWS_DEFAULT_ACL = 'public-read'
AWS_S3_FILE_OVERWRITE = False
AWS_QUERYSTRING_AUTH = False
AWS_S3_ENCRYPTION = True  # Server-side encryption

# Media files
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
MEDIA_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/media/'

# Static files (if serving from S3)
# STATICFILES_STORAGE = 'storages.backends.s3boto3.S3StaticStorage'
# STATIC_URL = f'https://{AWS_S3_CUSTOM_DOMAIN}/static/'
```

#### 3.4 Migrate Existing Media Files

```bash
# Script to migrate local media to S3
# File: backend/scripts/migrate_media_to_s3.py

from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from pathlib import Path
import os

MEDIA_ROOT = Path('/path/to/backend/media')

def migrate_files():
    count = 0
    for root, dirs, files in os.walk(MEDIA_ROOT):
        for file in files:
            local_path = Path(root) / file
            relative_path = local_path.relative_to(MEDIA_ROOT)
            
            print(f'Uploading {relative_path}...')
            
            with open(local_path, 'rb') as f:
                default_storage.save(str(relative_path), ContentFile(f.read()))
            
            count += 1
            if count % 100 == 0:
                print(f'Uploaded {count} files...')
    
    print(f'Migration complete! Uploaded {count} files.')

if __name__ == '__main__':
    migrate_files()
```

```bash
# Run migration
export DJANGO_SETTINGS_MODULE=core.settings.production
# Set AWS credentials
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_S3_BUCKET=ungdomsappen-media

python scripts/migrate_media_to_s3.py
```

---

### Step 4: Application Server Setup (Week 2)

#### 4.1 Install Production Server

```bash
# Add to requirements.txt
gunicorn==21.2.0
gevent==23.9.1
```

#### 4.2 Gunicorn Configuration

**File: backend/gunicorn_config.py**

```python
import multiprocessing

# Server socket
bind = '0.0.0.0:8000'
backlog = 2048

# Worker processes
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = 'gevent'
worker_connections = 1000
max_requests = 1000  # Restart workers after 1000 requests
max_requests_jitter = 50
timeout = 30
keepalive = 5

# Logging
accesslog = '/var/log/gunicorn/access.log'
errorlog = '/var/log/gunicorn/error.log'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = 'ungdomsappen'

# Server mechanics
daemon = False
pidfile = '/var/run/gunicorn.pid'
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL (if terminating SSL at application level)
# keyfile = '/path/to/key.pem'
# certfile = '/path/to/cert.pem'
```

#### 4.3 Systemd Service

**File: /etc/systemd/system/ungdomsappen.service**

```ini
[Unit]
Description=Ungdomsappen Django Application
After=network.target postgresql.service redis.service

[Service]
Type=notify
User=ungdomsappen
Group=ungdomsappen
WorkingDirectory=/opt/ungdomsappen/backend
Environment="DJANGO_SETTINGS_MODULE=core.settings.production"
EnvironmentFile=/opt/ungdomsappen/.env
ExecStart=/opt/ungdomsappen/venv/bin/gunicorn \
    --config /opt/ungdomsappen/backend/gunicorn_config.py \
    core.asgi:application -k uvicorn.workers.UvicornWorker
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure
RestartSec=10s

[Install]
WantedBy=multi-user.target
```

#### 4.4 Nginx Configuration

**File: /etc/nginx/sites-available/ungdomsappen**

```nginx
upstream django {
    server 127.0.0.1:8000;
    # If multiple servers:
    # server 10.0.1.10:8000;
    # server 10.0.1.11:8000;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ungdomsappen.se www.ungdomsappen.se;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ungdomsappen.se www.ungdomsappen.se;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/ungdomsappen.se/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ungdomsappen.se/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Client upload size
    client_max_body_size 50M;

    # Static files (if not using CDN)
    location /static/ {
        alias /opt/ungdomsappen/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files (if not using S3)
    # location /media/ {
    #     alias /opt/ungdomsappen/backend/media/;
    #     expires 30d;
    # }

    # Django application
    location / {
        proxy_pass http://django;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://django;
    }
}
```

---

### Step 5: Monitoring Setup (Week 2)

#### 5.1 Application Monitoring

**Option A: Sentry (Recommended for errors)**

```bash
# Add to requirements.txt
sentry-sdk==1.39.2
```

```python
# settings/production.py
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

sentry_sdk.init(
    dsn=os.environ.get('SENTRY_DSN'),
    integrations=[DjangoIntegration()],
    traces_sample_rate=0.1,  # 10% of transactions
    profiles_sample_rate=0.1,
    environment='production',
    release=os.environ.get('GIT_COMMIT', 'unknown'),
)
```

**Option B: Self-hosted monitoring stack**

- Prometheus for metrics
- Grafana for dashboards
- Loki for logs

#### 5.2 Database Monitoring

**PostgreSQL monitoring queries**:

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
AND state = 'active';

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;

-- Index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;
```

#### 5.3 Custom Health Check Endpoint

**File: backend/core/health.py** (create new)

```python
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import redis as redis_client

def health_check(request):
    """Health check endpoint for load balancer"""
    health = {
        'status': 'healthy',
        'database': False,
        'cache': False,
        'redis_channels': False,
    }
    
    try:
        # Check database
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        health['database'] = True
    except Exception:
        health['status'] = 'unhealthy'
    
    try:
        # Check cache
        cache.set('health_check', 'ok', 10)
        health['cache'] = cache.get('health_check') == 'ok'
    except Exception:
        health['status'] = 'unhealthy'
    
    try:
        # Check Redis for channels
        from django.conf import settings
        r = redis_client.from_url(settings.CHANNEL_LAYERS['default']['CONFIG']['hosts'][0])
        r.ping()
        health['redis_channels'] = True
    except Exception:
        health['status'] = 'unhealthy'
    
    status_code = 200 if health['status'] == 'healthy' else 503
    return JsonResponse(health, status=status_code)

def readiness_check(request):
    """Kubernetes-style readiness probe"""
    # Add any checks for whether the app is ready to receive traffic
    return JsonResponse({'status': 'ready'})

def liveness_check(request):
    """Kubernetes-style liveness probe"""
    # Simple check that the app is running
    return JsonResponse({'status': 'alive'})
```

```python
# Add to urls.py
from core.health import health_check, readiness_check, liveness_check

urlpatterns = [
    path('health/', health_check, name='health'),
    path('health/ready/', readiness_check, name='readiness'),
    path('health/live/', liveness_check, name='liveness'),
    # ... other patterns
]
```

---

## Configuration Examples

### Environment Variables (.env file)

**File: /opt/ungdomsappen/.env** (production)

```bash
# Django
DJANGO_SETTINGS_MODULE=core.settings.production
DJANGO_SECRET_KEY=<generate-with-python-secrets.token_urlsafe(50)>
ALLOWED_HOSTS=ungdomsappen.se,www.ungdomsappen.se,api.ungdomsappen.se
DEBUG=False

# Database
DB_NAME=ungdomsappen_prod
DB_USER=ungdomsappen_user
DB_PASSWORD=<strong-password>
DB_HOST=your-db-host.example.com
DB_PORT=5432

# Redis
REDIS_URL=redis://your-redis-host.example.com:6379

# Celery
CELERY_BROKER_URL=redis://your-redis-host.example.com:6379/0
CELERY_RESULT_BACKEND=redis://your-redis-host.example.com:6379/0
CELERY_TASK_ALWAYS_EAGER=False

# AWS S3
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_S3_BUCKET=ungdomsappen-media-prod
AWS_S3_REGION=eu-north-1
CDN_DOMAIN=<your-cloudfront-domain>.cloudfront.net

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=<smtp-host>
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=<username>
EMAIL_HOST_PASSWORD=<password>
DEFAULT_FROM_EMAIL=Ungdomsappen <noreply@ungdomsappen.se>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>

# Frontend
FRONTEND_URL=https://ungdomsappen.se
```

### Docker Compose (Optional)

**File: docker-compose.production.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ungdomsappen
      POSTGRES_USER: ungdomsappen_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  web:
    build: ./backend
    command: gunicorn core.asgi:application -k uvicorn.workers.UvicornWorker -c gunicorn_config.py
    volumes:
      - ./backend:/app
      - static_volume:/app/staticfiles
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  celery_worker:
    build: ./backend
    command: celery -A core worker -l info --concurrency=4
    volumes:
      - ./backend:/app
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  celery_beat:
    build: ./backend
    command: celery -A core beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
    volumes:
      - ./backend:/app
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/staticfiles
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - web
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  static_volume:
```

---

## Testing & Validation

### Pre-Migration Testing Checklist

```bash
# 1. Backup current database
python manage.py dumpdata > pre_migration_backup.json
cp db.sqlite3 db.sqlite3.backup

# 2. Run all tests
python manage.py test

# 3. Check for missing migrations
python manage.py makemigrations --dry-run --check

# 4. Validate models
python manage.py check

# 5. Collect static files
python manage.py collectstatic --noinput

# 6. Test email sending
python manage.py shell
>>> from django.core.mail import send_mail
>>> send_mail('Test', 'Test message', 'from@example.com', ['to@example.com'])
```

### Post-Migration Validation

```bash
# 1. Verify database connection
python manage.py dbshell
# Should connect to PostgreSQL

# 2. Check migrations
python manage.py showmigrations
# All should be [X] applied

# 3. Verify data integrity
python manage.py shell
>>> from users.models import User
>>> User.objects.count()
>>> # Verify counts match pre-migration

# 4. Test cache
python manage.py shell
>>> from django.core.cache import cache
>>> cache.set('test', 'value', 60)
>>> cache.get('test')
# Should return 'value'

# 5. Test file upload
# Upload an image through the admin panel
# Verify it appears in S3

# 6. Test WebSocket
# Open messaging, send a message
# Verify real-time delivery

# 7. Check scheduled jobs
python manage.py shell
>>> from django_apscheduler.models import DjangoJob
>>> DjangoJob.objects.all()
# Should list your scheduled jobs
```

### Load Testing

**Install tools**:
```bash
pip install locust
```

**File: backend/locustfile.py**

```python
from locust import HttpUser, task, between
import random

class UngdomsappenUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login"""
        response = self.client.post('/api/auth/jwt/create/', {
            'email': f'test{random.randint(1, 1000)}@example.com',
            'password': 'testpass123'
        })
        if response.status_code == 200:
            self.token = response.json()['access']
            self.client.headers.update({
                'Authorization': f'JWT {self.token}'
            })
    
    @task(3)
    def view_posts(self):
        """View posts feed"""
        self.client.get('/api/posts/')
    
    @task(2)
    def view_events(self):
        """View events"""
        self.client.get('/api/events/')
    
    @task(1)
    def view_profile(self):
        """View own profile"""
        self.client.get('/api/users/me/')
    
    @task(1)
    def view_notifications(self):
        """View notifications"""
        self.client.get('/api/notifications/')
```

**Run load test**:
```bash
# Start with 100 users, ramp up to 5000
locust -f locustfile.py --host=https://your-staging-site.com \
  --users 5000 --spawn-rate 100 --run-time 10m
```

---

## Cost Estimates

### Monthly Operating Costs

#### Option 1: Swedish Provider (Recommended for Compliance)

**Provider**: Safespring, Binero, CloudNordic

| Component | Specification | Monthly Cost (SEK) |
|-----------|--------------|-------------------|
| PostgreSQL | 4 cores, 16GB RAM, 500GB SSD | 2,500-3,500 |
| Redis Cluster | 3 nodes, 4GB RAM each | 1,200-1,800 |
| App Servers | 3× VMs (4 cores, 8GB) | 2,400-3,600 |
| Object Storage | 200GB + 500GB transfer/month | 500-800 |
| Load Balancer | Managed service | 300-500 |
| Backups | 500GB backup storage | 300-500 |
| Monitoring | Basic monitoring | 200-400 |
| **Total** | | **7,400-10,100 SEK/month** |

**Pros**:
- Data stays in Sweden
- Swedish support
- GDPR compliance built-in
- Preferred by municipalities

**Cons**:
- Slightly more expensive
- Fewer integrated services

#### Option 2: AWS Stockholm Region

| Component | Service | Monthly Cost (USD) | Monthly Cost (SEK) |
|-----------|---------|-------------------|-------------------|
| Database | RDS PostgreSQL (db.m5.xlarge) | $350 | 3,850 |
| Cache | ElastiCache Redis (cache.m5.large) | $180 | 1,980 |
| Compute | EC2 (3× t3.large) | $280 | 3,080 |
| Storage | S3 (200GB + CloudFront) | $35 | 385 |
| Load Balancer | Application Load Balancer | $22 | 242 |
| Backups | S3 + RDS snapshots | $30 | 330 |
| Data Transfer | Outbound (estimate) | $50 | 550 |
| Monitoring | CloudWatch + Alarms | $30 | 330 |
| **Total** | | **~$977** | **~10,750 SEK/month** |

**Pros**:
- Most mature platform
- Excellent documentation
- Easy to scale
- Many integrated services

**Cons**:
- More expensive
- International provider (but Swedish data center)

#### Option 3: Hybrid Approach

- **Database & Redis**: Swedish provider (Safespring)
- **Object Storage**: Wasabi/Backblaze B2 (cheaper)
- **CDN**: Cloudflare (free tier or $20/month)
- **App Servers**: Swedish VPS provider

**Estimated**: 5,000-7,000 SEK/month

### Cost Scaling Projections

| Users | Monthly Cost (SEK) |
|-------|-------------------|
| 60,000 (current) | 7,000-10,000 |
| 100,000 | 10,000-15,000 |
| 200,000 | 15,000-25,000 |
| 500,000 | 30,000-50,000 |

---

## GDPR & Compliance

### Required Features for Swedish Municipalities

#### ✅ Already Implemented

1. **Data Retention Policy**
   - Configurable retention periods
   - Automated deletion warnings (30 days, 7 days)
   - User anonymization (not full deletion)
   - Per-municipality overrides

2. **Right to Rectification**
   - Users can edit their own data
   - Admins can correct user data

3. **Security Features**
   - Password hashing (PBKDF2)
   - JWT authentication
   - 2FA support
   - Session management

#### ⚠️ To Be Implemented

1. **Data Export (Article 20 - Right to Data Portability)**

```python
# backend/users/views.py
from django.http import HttpResponse
import json

class UserViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['get'])
    def export_my_data(self, request):
        """Export all user data in JSON format"""
        user = request.user
        
        data = {
            'profile': {
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                # ... all profile fields
            },
            'visits': list(user.visits.values()),
            'messages': list(user.sent_messages.values()),
            'posts': list(user.posts.values()),
            'events': list(user.registered_events.values()),
            'rewards': list(user.reward_usages.values()),
            # ... all user data
        }
        
        response = HttpResponse(
            json.dumps(data, indent=2, default=str),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="my_data_{user.id}.json"'
        return response
```

2. **Audit Logging**

```python
# backend/core/models.py
class AuditLog(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    admin_user = models.ForeignKey('users.User', on_delete=models.SET_NULL, 
                                     null=True, related_name='admin_actions')
    action = models.CharField(max_length=50)  # CREATE, UPDATE, DELETE, ACCESS
    model_name = models.CharField(max_length=100)
    object_id = models.IntegerField(null=True)
    changes = models.JSONField(null=True)
    ip_address = models.GenericIPAddressField(null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['model_name', 'object_id']),
        ]
```

3. **Consent Management**

```python
# backend/users/models.py
class UserConsent(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='consents')
    consent_type = models.CharField(max_length=50, choices=[
        ('TERMS', 'Terms of Service'),
        ('PRIVACY', 'Privacy Policy'),
        ('MARKETING', 'Marketing Communications'),
        ('DATA_PROCESSING', 'Data Processing'),
    ])
    version = models.CharField(max_length=20)  # e.g., "1.0", "2024-01-15"
    consented_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    withdrawn_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['user', 'consent_type', 'version']
```

4. **Self-Service Account Deletion**

```python
# backend/users/views.py
class UserViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['post'])
    def delete_my_account(self, request):
        """Allow user to delete their own account"""
        user = request.user
        password = request.data.get('password')
        
        # Verify password
        if not user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send confirmation email
        send_account_deletion_confirmation(user)
        
        # Schedule deletion (7-day grace period)
        user.scheduled_deletion_at = timezone.now() + timedelta(days=7)
        user.save()
        
        return Response({
            'message': 'Account scheduled for deletion in 7 days. You can cancel by logging in.'
        })
```

### Data Processing Agreement (DPA) Template

Each municipality needs a signed DPA. Create template:

**File: docs/DPA_Template.md**

```markdown
# Data Processing Agreement
## Between [Municipality Name] and Ungdomsappen

### 1. Purpose
This agreement governs the processing of personal data...

### 2. Scope
Ungdomsappen processes the following data:
- Youth member profiles (name, email, birthdate)
- Guardian information
- Check-in/check-out records
- Messages and communications
- ...

### 3. Security Measures
- Encryption at rest and in transit
- Access controls and authentication
- Regular security audits
- Incident response procedures

### 4. Sub-processors
- AWS (Stockholm region) - Infrastructure
- [Email provider] - Email delivery
- [Other services]

### 5. Data Retention
- As configured by municipality
- Minimum 6 months, maximum 36 months
- Automated deletion with warnings

### 6. Rights of Data Subjects
- Right to access
- Right to rectification
- Right to erasure
- Right to data portability

### 7. Data Breach Notification
- Notification within 24 hours
- Root cause analysis provided
- Remediation plan

[Additional sections...]
```

---

## Complete Checklists

### Phase 1: Critical Infrastructure (2-3 weeks)

#### Week 1: Database & Cache

- [ ] **Day 1-2: PostgreSQL Setup**
  - [ ] Choose provider (Swedish recommended)
  - [ ] Provision PostgreSQL instance (4 cores, 16GB RAM minimum)
  - [ ] Configure SSL/TLS required
  - [ ] Set up automated backups (daily, 30-day retention)
  - [ ] Create database and user
  - [ ] Configure connection pooling
  - [ ] Test connectivity from application server

- [ ] **Day 2-3: Database Migration**
  - [ ] Install `psycopg2-binary` and `django-db-connection-pool`
  - [ ] Create production settings file
  - [ ] Backup SQLite database (`dumpdata`)
  - [ ] Update settings to use PostgreSQL
  - [ ] Run migrations on PostgreSQL
  - [ ] Load data from backup
  - [ ] Verify data integrity (counts match)
  - [ ] Test all CRUD operations
  - [ ] Update `.gitignore` to exclude SQLite files

- [ ] **Day 3-4: Add Database Indexes**
  - [ ] Create index migrations for `users` app
  - [ ] Create index migrations for `posts` app
  - [ ] Create index migrations for `events` app
  - [ ] Create index migrations for `visits` app
  - [ ] Create index migrations for `messenger` app
  - [ ] Apply all index migrations
  - [ ] Test query performance improvement

- [ ] **Day 4-5: Redis Setup**
  - [ ] Provision Redis cluster (2-3 instances recommended)
  - [ ] Configure persistence (RDB + AOF)
  - [ ] Install `django-redis`, `redis`, `channels-redis`
  - [ ] Configure Django caching with Redis
  - [ ] Move sessions to Redis
  - [ ] Update Channels layer to use Redis
  - [ ] Update Celery to use Redis
  - [ ] Test cache functionality
  - [ ] Test WebSocket functionality

#### Week 2: Storage & Application Server

- [ ] **Day 1-3: Cloud Storage Migration**
  - [ ] Choose storage provider (S3, Wasabi, B2)
  - [ ] Create storage bucket
  - [ ] Configure bucket permissions (private with signed URLs)
  - [ ] Enable server-side encryption
  - [ ] Set up CDN (CloudFront, Cloudflare)
  - [ ] Install `django-storages` and `boto3`
  - [ ] Update Django settings for cloud storage
  - [ ] Test file upload in dev environment
  - [ ] Migrate existing media files to cloud storage
  - [ ] Verify all images load correctly
  - [ ] Update image URLs in database if needed
  - [ ] Delete local media files after verification

- [ ] **Day 3-5: Application Server Setup**
  - [ ] Install `gunicorn` and `gevent`
  - [ ] Create Gunicorn configuration file
  - [ ] Test Gunicorn locally
  - [ ] Set up Nginx configuration
  - [ ] Install SSL certificate (Let's Encrypt)
  - [ ] Configure security headers
  - [ ] Set up systemd service for Gunicorn
  - [ ] Test service start/stop/restart
  - [ ] Test application through Nginx
  - [ ] Configure log rotation

- [ ] **Day 5-7: Environment & Secrets**
  - [ ] Create production `.env` file
  - [ ] Generate new `SECRET_KEY` (use `secrets.token_urlsafe(50)`)
  - [ ] Set `DEBUG=False`
  - [ ] Update `ALLOWED_HOSTS`
  - [ ] Set `TIME_ZONE='Europe/Stockholm'`
  - [ ] Configure all database credentials
  - [ ] Configure Redis URL
  - [ ] Configure AWS/storage credentials
  - [ ] Configure email SMTP settings
  - [ ] Test with production environment
  - [ ] Verify no hardcoded secrets remain in code

#### Week 3: Celery & Final Testing

- [ ] **Day 1-2: Celery Workers**
  - [ ] Set up Celery worker systemd service
  - [ ] Set up Celery beat systemd service
  - [ ] Test email sending through Celery
  - [ ] Test scheduled jobs
  - [ ] Configure Celery queues (default, email, heavy)
  - [ ] Set up Flower for monitoring (optional)
  - [ ] Test task retry logic
  - [ ] Verify async email works end-to-end

- [ ] **Day 3-5: Integration Testing**
  - [ ] Test user registration flow
  - [ ] Test login and JWT refresh
  - [ ] Test file uploads (images, documents)
  - [ ] Test WebSocket messaging
  - [ ] Test scheduled jobs run correctly
  - [ ] Test email sending (all types)
  - [ ] Test check-in/check-out flow
  - [ ] Test post creation and visibility
  - [ ] Test event creation and notifications
  - [ ] Test inventory borrowing
  - [ ] Verify all caching works
  - [ ] Test graceful degradation (Redis down, S3 down)

### Phase 2: Optimization & Reliability (2-3 weeks)

#### Week 4: Database Optimization

- [ ] **Day 1-2: Query Optimization**
  - [ ] Install Django Debug Toolbar in dev
  - [ ] Identify N+1 queries
  - [ ] Add `select_related()` for foreign keys
  - [ ] Add `prefetch_related()` for M2M and reverse FKs
  - [ ] Add `.only()` and `.defer()` where appropriate
  - [ ] Test query count reduction
  - [ ] Benchmark performance improvements

- [ ] **Day 2-3: Read Replicas**
  - [ ] Set up 1-2 PostgreSQL read replicas
  - [ ] Configure Django database router
  - [ ] Route heavy read queries to replicas
  - [ ] Test replication lag
  - [ ] Test failover scenario

- [ ] **Day 3-5: Caching Strategy**
  - [ ] Identify top 20 slowest endpoints
  - [ ] Implement view caching with `@cache_page`
  - [ ] Implement function result caching
  - [ ] Cache user statistics
  - [ ] Cache dashboard KPIs
  - [ ] Cache popular posts/events
  - [ ] Implement cache invalidation on updates
  - [ ] Test cache hit rates (target >70%)
  - [ ] Monitor cache memory usage

#### Week 5: Monitoring & Backups

- [ ] **Day 1-2: Application Monitoring**
  - [ ] Set up Sentry for error tracking
  - [ ] Configure error alerting
  - [ ] Set up application performance monitoring
  - [ ] Create custom metrics for key operations
  - [ ] Test error capture and alerting

- [ ] **Day 2-3: Infrastructure Monitoring**
  - [ ] Set up database monitoring
  - [ ] Set up Redis monitoring
  - [ ] Monitor CPU, RAM, disk usage
  - [ ] Monitor network traffic
  - [ ] Set up uptime monitoring
  - [ ] Configure alerting thresholds
  - [ ] Create monitoring dashboards

- [ ] **Day 3-4: Backup System**
  - [ ] Configure automated daily database backups
  - [ ] Test database restore procedure
  - [ ] Set up media file backups
  - [ ] Test media file restore
  - [ ] Document backup locations
  - [ ] Document restore procedures
  - [ ] Schedule monthly restore tests

- [ ] **Day 4-5: Health Checks & Logging**
  - [ ] Implement health check endpoint
  - [ ] Configure load balancer health checks
  - [ ] Set up log aggregation (CloudWatch, Loki, etc.)
  - [ ] Configure log rotation
  - [ ] Set up security log monitoring
  - [ ] Test log searching and filtering

#### Week 6: Load Testing & Security

- [ ] **Day 1-3: Load Testing**
  - [ ] Install Locust or similar tool
  - [ ] Create load test scenarios
  - [ ] Run baseline load test (1000 users)
  - [ ] Run target load test (5000 users)
  - [ ] Run stress test (find breaking point)
  - [ ] Identify bottlenecks
  - [ ] Optimize identified issues
  - [ ] Re-run tests to verify improvements
  - [ ] Document performance metrics

- [ ] **Day 3-5: Security Audit**
  - [ ] Run security scan (OWASP ZAP or similar)
  - [ ] Review all API endpoints for auth
  - [ ] Review permission checks
  - [ ] Test rate limiting
  - [ ] Test SQL injection prevention
  - [ ] Test XSS prevention
  - [ ] Review CORS configuration
  - [ ] Review CSP headers
  - [ ] Fix any identified issues
  - [ ] Document security measures

### Phase 3: GDPR & Production Hardening (Ongoing)

#### GDPR Compliance

- [ ] **Data Export Feature**
  - [ ] Implement user data export API
  - [ ] Create frontend UI for data export
  - [ ] Test export includes all user data
  - [ ] Test export format is readable

- [ ] **Audit Logging**
  - [ ] Create `AuditLog` model
  - [ ] Add logging to sensitive operations
  - [ ] Log admin actions
  - [ ] Log data access
  - [ ] Create audit log viewer for admins
  - [ ] Test audit trail completeness

- [ ] **Consent Management**
  - [ ] Create `UserConsent` model
  - [ ] Implement consent recording on signup
  - [ ] Create consent management UI
  - [ ] Log consent withdrawals
  - [ ] Update privacy policy versioning

- [ ] **Self-Service Deletion**
  - [ ] Implement account deletion request
  - [ ] Add 7-day grace period
  - [ ] Send confirmation email
  - [ ] Allow cancellation during grace period
  - [ ] Test full deletion flow

- [ ] **Documentation**
  - [ ] Create Data Processing Agreement template
  - [ ] Document all personal data stored
  - [ ] Document data retention policies
  - [ ] Document security measures
  - [ ] Create incident response plan
  - [ ] Create DPIA (if needed for minors)

#### Production Deployment

- [ ] **Staging Environment**
  - [ ] Set up staging environment (mirrors production)
  - [ ] Configure staging database
  - [ ] Configure staging Redis
  - [ ] Deploy to staging
  - [ ] Test all features in staging
  - [ ] Load test staging

- [ ] **Production Deployment**
  - [ ] Create deployment checklist
  - [ ] Schedule deployment window
  - [ ] Notify users of maintenance (if needed)
  - [ ] Deploy database migrations
  - [ ] Deploy application code
  - [ ] Verify health checks pass
  - [ ] Smoke test critical features
  - [ ] Monitor error rates
  - [ ] Monitor performance metrics
  - [ ] Keep rollback plan ready

- [ ] **Post-Deployment**
  - [ ] Monitor for 24 hours
  - [ ] Verify scheduled jobs run
  - [ ] Verify emails send correctly
  - [ ] Check error logs
  - [ ] Performance comparison (before/after)
  - [ ] User feedback collection
  - [ ] Document any issues and fixes

#### Operational Procedures

- [ ] **Documentation**
  - [ ] Create runbook for common operations
  - [ ] Document deployment procedure
  - [ ] Document rollback procedure
  - [ ] Document backup/restore procedures
  - [ ] Document monitoring and alerting
  - [ ] Document incident response
  - [ ] Create troubleshooting guide

- [ ] **Training**
  - [ ] Train team on production infrastructure
  - [ ] Train on monitoring tools
  - [ ] Train on incident response
  - [ ] Train on backup/restore
  - [ ] Practice failure scenarios

- [ ] **Continuous Improvement**
  - [ ] Weekly performance reviews
  - [ ] Monthly security reviews
  - [ ] Quarterly capacity planning
  - [ ] Regular dependency updates
  - [ ] Performance optimization sprints

---

## Quick Reference

### Critical Commands

```bash
# Database backup
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME | gzip > backup_$(date +%Y%m%d).sql.gz

# Database restore
gunzip < backup_20260115.sql.gz | psql -h $DB_HOST -U $DB_USER $DB_NAME

# Clear cache
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()

# Restart application
sudo systemctl restart ungdomsappen

# Restart workers
sudo systemctl restart ungdomsappen-celery-worker
sudo systemctl restart ungdomsappen-celery-beat

# View logs
sudo journalctl -u ungdomsappen -f
sudo tail -f /var/log/gunicorn/error.log

# Check health
curl https://ungdomsappen.se/health/

# Database connection count
psql -h $DB_HOST -U $DB_USER $DB_NAME \
  -c "SELECT count(*) FROM pg_stat_activity;"

# Redis info
redis-cli INFO
```

### Emergency Contacts

- **Infrastructure Provider**: [Contact info]
- **Database Support**: [Contact info]
- **On-call Developer**: [Phone]
- **Sysadmin**: [Phone]

### Key Metrics to Monitor

- **Response Time**: p95 < 200ms
- **Error Rate**: < 0.1%
- **Database Connections**: < 80% of max
- **Redis Memory**: < 80% of max
- **CPU Usage**: < 70% average
- **Disk Space**: > 20% free
- **Cache Hit Rate**: > 70%

---

## Conclusion

This migration guide provides a comprehensive roadmap to transform Ungdomsappen from a development setup to a production-ready, scalable platform capable of serving 60,000+ users.

**Key Takeaways**:
1. **SQLite is a showstopper** - PostgreSQL is mandatory
2. **Caching is critical** - Redis will dramatically improve performance
3. **Cloud storage is necessary** - Local storage won't scale
4. **Monitoring is essential** - You can't fix what you can't see
5. **GDPR compliance is mandatory** - Especially for Swedish municipalities

**Timeline**: 4-6 weeks for core migration, then ongoing optimization

**Budget**: 7,000-11,000 SEK/month for 60,000 users

Good luck with your migration! 🚀


