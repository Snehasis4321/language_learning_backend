# Automated Session Cleanup Setup Guide

Prevent wasting LiveKit credits by automatically cleaning up stale/abandoned sessions.

## Quick Start

### Option 1: Run Once (Manual)
```bash
npm run cleanup:auto
```

### Option 2: Run Continuously (Watch Mode)
```bash
npm run cleanup:watch
```
Runs cleanup every 5 minutes. Keep this terminal open or use PM2/screen.

---

## Production Deployment Options

### 🔷 Option A: Cron Job (Recommended for Linux/Mac)

Run cleanup every 5 minutes:

```bash
# Edit crontab
crontab -e

# Add this line:
*/5 * * * * cd /path/to/language_learning_backend && npm run cleanup:auto >> /tmp/livekit-cleanup.log 2>&1
```

Or use absolute paths:
```bash
*/5 * * * * /usr/local/bin/node /path/to/language_learning_backend/node_modules/.bin/tsx /path/to/language_learning_backend/scripts/auto-cleanup.ts >> /var/log/livekit-cleanup.log 2>&1
```

**Verify cron is running:**
```bash
crontab -l                           # List cron jobs
tail -f /tmp/livekit-cleanup.log     # Watch logs
```

---

### 🔷 Option B: PM2 (Process Manager)

Best for keeping cleanup running 24/7 with auto-restart.

**Install PM2:**
```bash
npm install -g pm2
```

**Start cleanup service:**
```bash
cd language_learning_backend
pm2 start npm --name "livekit-cleanup" -- run cleanup:watch
pm2 save
pm2 startup  # Enable on system restart
```

**Manage the service:**
```bash
pm2 status                    # Check status
pm2 logs livekit-cleanup      # View logs
pm2 restart livekit-cleanup   # Restart
pm2 stop livekit-cleanup      # Stop
pm2 delete livekit-cleanup    # Remove
```

---

### 🔷 Option C: systemd Service (Linux)

Create a system service that starts on boot.

**1. Create service file:**
```bash
sudo nano /etc/systemd/system/livekit-cleanup.service
```

**2. Add this configuration:**
```ini
[Unit]
Description=LiveKit Session Cleanup Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/language_learning_backend
ExecStart=/usr/bin/npm run cleanup:watch
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**3. Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable livekit-cleanup
sudo systemctl start livekit-cleanup

# Check status
sudo systemctl status livekit-cleanup

# View logs
sudo journalctl -u livekit-cleanup -f
```

---

### 🔷 Option D: Docker Container

Add to your `docker-compose.yml`:

```yaml
services:
  livekit-cleanup:
    build: .
    command: npm run cleanup:watch
    environment:
      - LIVEKIT_URL=${LIVEKIT_URL}
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
    restart: unless-stopped
```

---

### 🔷 Option E: AWS Lambda (Serverless)

Run cleanup on a schedule using AWS EventBridge.

**1. Create Lambda function** with Node.js runtime

**2. Add EventBridge trigger:**
- Schedule: `rate(5 minutes)`

**3. Deploy cleanup script** as Lambda handler

---

## Cleanup Rules

The auto-cleanup service removes sessions that meet any of these criteria:

1. **Empty for 10+ minutes** - No users in the room
2. **Stale session (30+ minutes)** - Old room with no users
3. **Marked as ended** - Session ended in backend but room still exists

**What is NOT cleaned:**
- Active sessions with users present
- Rooms younger than 10 minutes
- Any room with active participants

---

## Configuration

Edit `scripts/auto-cleanup.ts` to customize:

```typescript
const CLEANUP_INTERVAL = 5 * 60 * 1000;           // How often to run (5 min)
const MAX_SESSION_AGE = 30 * 60 * 1000;          // Max session age (30 min)
const PARTICIPANT_IDLE_THRESHOLD = 10 * 60 * 1000; // Empty room threshold (10 min)
```

---

## Monitoring

### View cleanup logs:
```bash
# If using cron
tail -f /tmp/livekit-cleanup.log

# If using PM2
pm2 logs livekit-cleanup

# If using systemd
sudo journalctl -u livekit-cleanup -f
```

### Check for zombie sessions:
```bash
npm run cleanup        # List all active sessions
npm run cleanup --all  # Force cleanup all sessions
```

---

## Troubleshooting

**Cleanup not running:**
- Check cron service: `sudo service cron status`
- Verify environment variables are set
- Check file permissions

**Too aggressive cleanup:**
- Increase `PARTICIPANT_IDLE_THRESHOLD`
- Increase `MAX_SESSION_AGE`

**Not cleaning enough:**
- Decrease thresholds
- Reduce `CLEANUP_INTERVAL` to run more frequently

---

## Cost Savings Estimate

**Before auto-cleanup:**
- Average zombie sessions: ~10/day
- Cost per session: $0.02/hour
- Wasted cost: ~$4.80/day = **$144/month**

**After auto-cleanup:**
- Zombie sessions cleaned within 5-10 minutes
- Wasted cost: ~$0.20/day = **$6/month**

**Monthly savings: ~$138** 💰

---

## Best Practices

✅ **DO:**
- Run auto-cleanup in production environments
- Monitor logs for errors
- Adjust thresholds based on usage patterns
- Use PM2 or systemd for reliability

❌ **DON'T:**
- Set cleanup interval < 1 minute (too aggressive)
- Disable cleanup in production
- Ignore cleanup logs/errors
- Clean up rooms with active users
