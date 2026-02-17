# Scheduler Quick Reference

## 📅 Daily Schedule (Weekday Example - Monday)

```
00:00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
02:00 🧹 Cleanup expired rewards (Sunday only)
03:00 🧹 Data retention processing
04:00 🧹 Cleanup old job logs
04:30 🧹 Cleanup old notifications
05:00 🧹 Cleanup deleted messages
06:00 🎁 Process birthday rewards
06:30 🎁 Process anniversary rewards
07:00 🎁 Most checked-in rewards - WEEKLY (Monday only)
      🎁 Most checked-in rewards - MONTHLY (1st only)
08:00 🎁 Notify expiring rewards
09:00 📧 Send birthday emails
10:00 📧 Send trial expiring emails
11:00 📧 Send survey reminders
12:00 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...
23:59 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTINUOUS JOBS:
📰 Every 5 min:  Publish scheduled events, courses, questionnaires
🔄 Every 15 min: Auto-checkout users from closed clubs
🔄 Every 30 min: Check for overdue inventory items

YEARLY JOBS:
📅 July 1st 00:00: Increment student grades
```

---

## 📊 Job Categories

### 🧹 Cleanup Jobs (5)
Keep database clean and performant
- Expired rewards (weekly)
- Inactive users (daily)
- Old job logs (daily)
- Old notifications (daily)
- Deleted messages (daily)

### 🎁 Reward Jobs (5)
Automate reward distribution
- Birthday rewards
- Anniversary rewards
- Most checked-in (weekly)
- Most checked-in (monthly)
- Expiring reward warnings

### 📧 Email & Notification Jobs (3)
Keep users engaged
- Birthday greetings
- Trial expiration warnings
- Survey completion reminders

### 📰 Publishing Jobs (3)
Auto-publish scheduled content
- Events
- Courses
- Questionnaires

### 🔄 Monitoring Jobs (2)
Track user activity
- Auto-checkout
- Overdue inventory

### 📅 Yearly Jobs (1)
Annual maintenance
- Grade increment (July 1st)

---

## 🔧 Common Commands

### Start Scheduler
```bash
cd /Users/ungdomsappen/the-youth-app/backend
source venv/bin/activate
python manage.py run_scheduler
```

### Test Individual Jobs
```bash
# Survey reminders
python manage.py send_survey_reminders

# Inventory check
python manage.py check_inventory_overdue

# Message cleanup (dry run)
python manage.py cleanup_deleted_messages --dry-run

# Reward notifications
python manage.py notify_expiring_rewards --days-before=3

# Reward cleanup (dry run)
python manage.py cleanup_expired_rewards --dry-run

# Birthday rewards
python manage.py process_birthday_rewards

# Anniversary rewards
python manage.py process_anniversary_rewards

# Most checked-in (specific club, dry run)
python manage.py process_most_checkedin_rewards --period=WEEKLY --club-id=1
```

---

## 📈 Expected Daily Activity

### Early Morning (2-7 AM)
**Peak automation time** - Most cleanup and reward jobs run
- Low user traffic
- Database maintenance
- Reward processing

### Morning (8-11 AM)
**Communication time** - Emails and notifications sent
- Reward expiration warnings
- Birthday greetings
- Trial warnings
- Survey reminders

### Throughout Day
**Continuous monitoring** - Real-time checks
- Content publishing (every 5 min)
- Auto-checkout (every 15 min)
- Inventory tracking (every 30 min)

---

## ⚠️ Important Notes

1. **Timezone**: All times are in `Europe/Stockholm` (configured in Django settings)

2. **Reward Jobs**: Only run if rewards are configured with correct triggers

3. **Graceful Failures**: All jobs have error handling and won't crash the scheduler

4. **No Spam**: Jobs check for duplicates before sending notifications/emails

5. **Database Impact**: Cleanup jobs run during low-traffic hours (2-5 AM)

---

## 🎯 Quick Stats

- **Total Jobs**: 18
- **Daily Jobs**: 11
- **Weekly Jobs**: 2 (Sunday cleanup + Monday rewards)
- **Monthly Jobs**: 1 (Most checked-in on 1st)
- **Yearly Jobs**: 1 (Grade increment July 1st)
- **Continuous Jobs**: 5 (publishing + monitoring)

---

## 📞 Troubleshooting

### Job Not Running?
1. Check scheduler is running: Look for process
2. Check logs: Console output shows execution
3. Verify timezone: Confirm `Europe/Stockholm`
4. Check job configuration: `run_scheduler.py`

### Job Failing?
1. Run manually to see error: `python manage.py <command_name>`
2. Check database connectivity
3. Verify all dependencies installed
4. Check permissions

### Too Many Notifications?
- Jobs check for duplicates (daily/24h)
- Adjust notification logic in respective commands
- Consider adding rate limiting

### Performance Issues?
- Separate time slots prevent overlap
- Heavy jobs run during low-traffic hours
- Consider scaling database if needed


