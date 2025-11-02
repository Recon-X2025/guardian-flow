# Trial Notifications System

## Overview

Automated email notifications for expiring trials alert tenant admins at key intervals before their trial ends.

---

## 🎯 Features

- **3 Notification Timings**:
  - 14 days before expiry (gentle reminder)
  - 7 days before expiry (warning)
  - 1 day before expiry (urgent action required)

- **Smart Deduplication**: Prevents duplicate emails on the same day

- **Multi-Admin Support**: Sends to all tenant admins and sys admins

- **Personalized Content**: Includes plan name, tenant name, and days remaining

---

## 🏗️ Architecture

### Edge Function
**Location**: `supabase/functions/send-trial-notifications/index.ts`

**Key Functionality**:
1. Queries for all trials expiring within 2 weeks
2. Calculates days remaining for each trial
3. Fetches tenant admin email addresses
4. Generates personalized email content
5. Inserts into `notification_queue` table
6. Deduplicates to prevent spam

### Database Tables Used

#### `tenant_subscriptions`
- Filters by `status = 'trial'`
- Checks `trial_end` date

#### `subscription_plans`
- Fetches plan `display_name` for personalization

#### `tenants`
- Fetches tenant `name` for personalization

#### `user_roles`
- Finds all tenant and sys admins

#### `profiles`
- Gets admin email and full name

#### `notification_queue`
- Stores queued email notifications
- Prevents duplicates via timestamp check

---

## 📧 Email Templates

### 14 Days Remaining (Gentle Reminder)
**Subject**: 📅 Your [Plan] Trial: 14 Days Remaining

**Tone**: Friendly, informative

### 7 Days Remaining (Warning)
**Subject**: ⏰ Your [Plan] Trial Expires in 7 Days

**Tone**: Warning, action-oriented

### 1 Day Remaining (Urgent)
**Subject**: 🚨 Action Required: Your [Plan] Trial Expires Today

**Tone**: Urgent, conversion-focused

---

## ⚙️ Configuration

### Environment Variables
```bash
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
APP_URL=<https://your-domain.com>  # Optional, defaults to guardian-flow.com
```

### Supabase Config
```toml
[functions.send-trial-notifications]
verify_jwt = false  # Public cron endpoint
```

---

## 🔄 Scheduling

### Manual Trigger
```bash
curl -X POST \
  https://YOUR_PROJECT.supabase.co/functions/v1/send-trial-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Automated Cron (Recommended)
Set up a scheduled task to call this function daily:

**Vercel Cron** (if using Vercel):
```json
{
  "crons": [
    {
      "path": "/api/cron/trial-notifications",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Supabase PgCron**:
```sql
SELECT cron.schedule(
  'send-trial-notifications',
  '0 9 * * *',  -- Daily at 9 AM
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-trial-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

---

## 📊 Monitoring

### Check Queued Notifications
```sql
SELECT 
  recipient,
  subject,
  scheduled_for,
  status,
  created_at
FROM notification_queue
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 50;
```

### Check Recent Sends
```sql
SELECT 
  recipient,
  subject,
  sent_at,
  status
FROM notification_queue
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 50;
```

### Analytics Query
```sql
-- Trials expiring by day
SELECT 
  DATE(trial_end) as expiry_date,
  COUNT(*) as trial_count
FROM tenant_subscriptions
WHERE status = 'trial'
  AND trial_end > NOW()
  AND trial_end < NOW() + INTERVAL '14 days'
GROUP BY DATE(trial_end)
ORDER BY expiry_date;
```

---

## 🧪 Testing

### Test Locally
```bash
# Start Supabase locally
supabase start

# Invoke function manually
supabase functions invoke send-trial-notifications
```

### Create Test Trial
```sql
-- Insert test subscription with trial ending tomorrow
INSERT INTO tenant_subscriptions (
  tenant_id,
  plan_id,
  status,
  trial_start,
  trial_end,
  current_period_start,
  current_period_end
)
SELECT 
  'YOUR_TEST_TENANT_ID',
  id,
  'trial',
  NOW() - INTERVAL '29 days',
  NOW() + INTERVAL '1 day',
  NOW() - INTERVAL '29 days',
  NOW() + INTERVAL '1 day'
FROM subscription_plans
WHERE name = 'professional'
LIMIT 1;
```

### Verify Notification Created
```sql
SELECT * FROM notification_queue
WHERE subject LIKE '%Trial Expires%'
ORDER BY created_at DESC
LIMIT 5;
```

---

## 🔒 Security

- **Service Role**: Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- **No Auth Required**: Designed for cron job calls
- **Sanitized Input**: All user data sanitized before email generation
- **Rate Limited**: Max 1 notification per day per recipient

---

## 📈 Metrics to Track

1. **Open Rate**: Track email opens (requires email provider analytics)
2. **Click Rate**: Track upgrade link clicks
3. **Conversion Rate**: Trials that convert to paid
4. **Send Success Rate**: Notifications successfully queued
5. **Response Time**: Days to conversion after notification

---

## 🐛 Troubleshooting

### No Notifications Sent
1. Check if trials are expiring within 2 weeks
2. Verify tenant admins exist
3. Check notification_queue for errors

### Duplicate Notifications
1. Verify deduplication query is working
2. Check for cron job running multiple times
3. Ensure `created_at` timestamp is correct

### Missing Admin Emails
1. Verify user_roles has correct tenants
2. Check profiles table for email addresses
3. Ensure admins have correct role assignments

---

## 🚀 Future Enhancements

- [ ] Custom email templates per industry
- [ ] A/B testing subject lines
- [ ] SMS notifications for urgent alerts
- [ ] In-app push notifications
- [ ] Admin preference controls
- [ ] Automated trial extension offers
- [ ] Win-back campaigns for expired trials

---

## 📝 Changelog

### v1.0.0 (2024-11-01)
- Initial implementation
- 3-timing notification system
- Multi-admin support
- Deduplication logic
- Personalized email content

