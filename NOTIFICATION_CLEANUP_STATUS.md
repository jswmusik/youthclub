# 🗑️ Notification Cleanup System - Status Report

## ✅ Is Automatic Cleanup Implemented?

**YES!** The notification cleanup feature is fully implemented and working.

## 📋 Cleanup Details

### Retention Period
- **7 days** - Notifications older than 7 days are automatically deleted

### When It Runs
- **Daily at 4:30 AM** (Swedish time)

### What Gets Deleted
- All notifications where `created_at` is older than 7 days
- Both read and unread notifications are deleted

### Implementation Location
- **File**: `/backend/core/management/commands/run_scheduler.py`
- **Function**: `cleanup_old_notifications_job()` (lines 163-184)
- **Scheduled**: Line 308-315

## 🔧 How It Works

```python
def cleanup_old_notifications_job():
    """
    Daily job to delete notifications older than 7 days.
    This keeps the notifications table clean and prevents it from growing indefinitely.
    """
    from django.utils import timezone
    from datetime import timedelta
    from notifications.models import Notification
    
    # Calculate the cutoff date (7 days ago)
    cutoff_date = timezone.now() - timedelta(days=7)
    
    # Get count before deletion for logging
    old_notifications = Notification.objects.filter(created_at__lt=cutoff_date)
    count = old_notifications.count()
    
    if count > 0:
        # Delete old notifications
        old_notifications.delete()
        logger.info(f"Notification cleanup: Deleted {count} notification(s) older than 7 days")
    else:
        logger.info("Notification cleanup: No old notifications to delete")
```

### Scheduled Job Configuration

```python
scheduler.add_job(
    cleanup_old_notifications_job,
    trigger=CronTrigger(hour=4, minute=30),  # 4:30 AM daily
    id="cleanup_old_notifications",
    max_instances=1,
    replace_existing=True,
)
```

## ⚠️ Current Status: NOT RUNNING

Based on your terminal inspection, **the scheduler is NOT currently running**.

### Why?

The scheduler requires a **separate process** to be running:

```bash
python manage.py run_scheduler
```

### What's Currently Running

1. ✅ Django server (Terminal 6) - `daphne -b 0.0.0.0 -p 8000 core.asgi:application`
2. ✅ Frontend server (Terminal 2) - `npm run dev`
3. ✅ Celery worker (Terminal 4) - `celery -A core worker -l info`
4. ❌ **Scheduler - NOT RUNNING**

### Impact

Without the scheduler running:
- ❌ Notifications are **NOT being deleted** automatically
- ❌ Old notifications accumulate in the database
- ❌ Scheduled events, courses, questionnaires are not auto-published
- ❌ Birthday emails are not sent
- ❌ Trial expiring emails are not sent
- ❌ Data retention processing not running

## 🚀 How to Enable It

### Development (Local)

**Option 1: Run in a new terminal (Recommended)**

Open **Terminal 3** (or any new terminal):

```bash
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
python manage.py run_scheduler
```

You should see:
```
============================================================
APSCHEDULER STARTED
============================================================
Registered scheduled jobs:
  • Process inactive users (data retention) - Daily at 3:00 AM
  • Publish scheduled events - Every 5 minutes
  • Publish scheduled courses - Every 5 minutes
  • Publish scheduled questionnaires - Every 5 minutes
  • Cleanup old job logs - Daily at 4:00 AM
  • Cleanup old notifications - Daily at 4:30 AM
  • Increment student grades - Yearly on July 1st
  • Send birthday emails - Daily at 9:00 AM
  • Send trial expiring emails - Daily at 10:00 AM
============================================================
Press Ctrl+C to stop.
```

**Option 2: Test cleanup manually (without waiting for 4:30 AM)**

```bash
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
python manage.py shell
```

```python
from django.utils import timezone
from datetime import timedelta
from notifications.models import Notification

# Check current notification count
total = Notification.objects.count()
print(f"Total notifications: {total}")

# Check how many are older than 7 days
cutoff_date = timezone.now() - timedelta(days=7)
old_count = Notification.objects.filter(created_at__lt=cutoff_date).count()
print(f"Notifications older than 7 days: {old_count}")

# Delete old notifications (manual cleanup)
if old_count > 0:
    Notification.objects.filter(created_at__lt=cutoff_date).delete()
    print(f"✅ Deleted {old_count} old notifications")
else:
    print("✅ No old notifications to delete")

# Check remaining
remaining = Notification.objects.count()
print(f"Remaining notifications: {remaining}")
```

### Production

**Option 1: Systemd Service (Ubuntu/Debian)**

Create `/etc/systemd/system/django-scheduler.service`:

```ini
[Unit]
Description=Django APScheduler Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=www-data
Group=www-data
EnvironmentFile=/var/www/the-youth-app/backend/.env
WorkingDirectory=/var/www/the-youth-app/backend
ExecStart=/var/www/the-youth-app/backend/venv/bin/python manage.py run_scheduler
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable django-scheduler
sudo systemctl start django-scheduler
sudo systemctl status django-scheduler
```

**Option 2: Docker Compose**

Add to your `docker-compose.yml`:

```yaml
scheduler:
  build: .
  command: python manage.py run_scheduler
  volumes:
    - ./backend:/app
  depends_on:
    - db
    - redis
  environment:
    - DATABASE_URL=postgres://...
    - REDIS_URL=redis://redis:6379/0
  restart: always
```

**Option 3: Supervisor**

Add to `/etc/supervisor/conf.d/django-scheduler.conf`:

```ini
[program:django-scheduler]
command=/var/www/the-youth-app/backend/venv/bin/python manage.py run_scheduler
directory=/var/www/the-youth-app/backend
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/django-scheduler.log
```

Reload supervisor:
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start django-scheduler
```

## 📊 Monitoring

### Check if Cleanup is Running

**View scheduler logs**:
```bash
# In the terminal where run_scheduler is running
# Look for:
"Notification cleanup: Deleted X notification(s) older than 7 days"
# or
"Notification cleanup: No old notifications to delete"
```

**Check last execution time**:
```bash
python manage.py shell
```

```python
from django_apscheduler.models import DjangoJobExecution

# Get last notification cleanup execution
last_run = DjangoJobExecution.objects.filter(
    job_id='cleanup_old_notifications'
).order_by('-run_time').first()

if last_run:
    print(f"Last run: {last_run.run_time}")
    print(f"Status: {last_run.status}")
    print(f"Duration: {last_run.duration}")
else:
    print("Cleanup has never run")
```

**Check notification count over time**:
```python
from notifications.models import Notification
from django.utils import timezone
from datetime import timedelta

# Today's notifications
today = Notification.objects.filter(
    created_at__gte=timezone.now().replace(hour=0, minute=0, second=0)
).count()

# Last 7 days
week = Notification.objects.filter(
    created_at__gte=timezone.now() - timedelta(days=7)
).count()

# Older than 7 days (should be 0 if cleanup is working)
old = Notification.objects.filter(
    created_at__lt=timezone.now() - timedelta(days=7)
).count()

print(f"Today: {today}")
print(f"Last 7 days: {week}")
print(f"Older than 7 days: {old} (should be 0 if cleanup is working)")
```

## 🔍 Troubleshooting

### Issue: Old Notifications Not Being Deleted

**Check 1**: Is scheduler running?
```bash
# Look for process
ps aux | grep run_scheduler
```

**Check 2**: Check scheduler logs
```bash
# In the terminal running scheduler, look for errors
```

**Check 3**: Check job execution history
```python
from django_apscheduler.models import DjangoJobExecution

# Get recent cleanup executions
executions = DjangoJobExecution.objects.filter(
    job_id='cleanup_old_notifications'
).order_by('-run_time')[:5]

for exec in executions:
    print(f"{exec.run_time} - Status: {exec.status}")
    if exec.exception:
        print(f"  Error: {exec.exception}")
```

### Issue: Scheduler Won't Start

**Check 1**: Database migrations
```bash
python manage.py migrate django_apscheduler
```

**Check 2**: Check for conflicts
```bash
python manage.py shell
```

```python
from django_apscheduler.models import DjangoJob

# Check if jobs are registered
jobs = DjangoJob.objects.all()
for job in jobs:
    print(f"{job.id}: {job.name} - Next run: {job.next_run_time}")
```

## 📈 Performance Impact

- **Database Size**: Prevents notifications table from growing indefinitely
- **Query Performance**: Keeps notification queries fast by limiting table size
- **Disk Space**: Reduces database disk usage
- **Expected Row Count**: ~7 days × average daily notifications
  - If 100 notifications/day → ~700 rows maximum
  - If 1000 notifications/day → ~7000 rows maximum

## 🎯 Summary

| Aspect | Status |
|--------|--------|
| **Feature Implemented** | ✅ YES |
| **Retention Period** | ✅ 7 days |
| **Schedule** | ✅ Daily at 4:30 AM |
| **Currently Running** | ❌ NO (needs to be started) |
| **Code Quality** | ✅ Good |
| **Logging** | ✅ Implemented |

### To Enable:

1. Open a new terminal
2. Run: `python manage.py run_scheduler`
3. Keep it running (like you do with Django server)

Or set up as a system service for production (see Production section above).

---

**Next Steps**: Start the scheduler in Terminal 3 to enable automatic cleanup! 🚀


