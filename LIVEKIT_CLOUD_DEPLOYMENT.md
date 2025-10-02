# Deploy to LiveKit Cloud (Free Tier)

## Overview

LiveKit Cloud **FREE tier** allows you to:
- ✅ Use their media servers (WebRTC)
- ✅ Connect your own agent workers
- ❌ NOT host agents on their infrastructure (paid only)

**Solution:** Deploy your agent on any hosting platform and connect to LiveKit Cloud.

---

## Step 1: Get LiveKit Cloud Credentials

1. Go to https://cloud.livekit.io
2. Sign up (free tier)
3. Create a project
4. Get credentials:
   - `LIVEKIT_URL`: `wss://your-project-xxxxx.livekit.cloud`
   - `LIVEKIT_API_KEY`: `APIxxxxxxxxxxxxx`
   - `LIVEKIT_API_SECRET`: `xxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 2: Choose Hosting Platform for Your Agent

### Option A: Railway.app (Recommended - $5/month, free trial)

**Setup:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set LIVEKIT_URL=wss://your-project.livekit.cloud
railway variables set LIVEKIT_API_KEY=your-key
railway variables set LIVEKIT_API_SECRET=your-secret
railway variables set CEREBRAS_API_KEY=your-key
railway variables set OPENAI_API_KEY=your-key
railway variables set START_AGENT_WITH_BACKEND=true

# Deploy
railway up
```

**Or use Railway UI:**
1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Connect your repo
4. Add environment variables
5. Deploy

---

### Option B: Render.com (Free tier available)

**Background Worker (Agent):**
1. New → Background Worker
2. Connect GitHub repo
3. Build Command: `pnpm install && pnpm build`
4. Start Command: `pnpm start:agent`
5. Add environment variables:
   ```
   LIVEKIT_URL=wss://your-project.livekit.cloud
   LIVEKIT_API_KEY=your-key
   LIVEKIT_API_SECRET=your-secret
   CEREBRAS_API_KEY=your-key
   OPENAI_API_KEY=your-key
   ```

**Web Service (Backend API):**
1. New → Web Service
2. Build Command: `pnpm install && pnpm build`
3. Start Command: `pnpm start`
4. Add same env vars + `START_AGENT_WITH_BACKEND=false`

**⚠️ Note:** Render free tier sleeps after 15min inactivity.

---

### Option C: Fly.io (Generous free tier)

**Deploy Backend + Agent together:**
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Create app
fly launch

# Set secrets
fly secrets set LIVEKIT_URL=wss://your-project.livekit.cloud
fly secrets set LIVEKIT_API_KEY=your-key
fly secrets set LIVEKIT_API_SECRET=your-secret
fly secrets set CEREBRAS_API_KEY=your-key
fly secrets set OPENAI_API_KEY=your-key
fly secrets set START_AGENT_WITH_BACKEND=true

# Deploy
fly deploy

# View logs
fly logs
```

**Or separate agent:**
```bash
# Create second app for agent
fly launch --dockerfile Dockerfile.agent --app my-agent
fly secrets set ... --app my-agent
fly deploy --app my-agent
```

---

### Option D: Digital Ocean App Platform ($5/month)

1. Create App → GitHub
2. Add **Background Worker** component:
   - Name: `agent`
   - Build: `pnpm install && pnpm build`
   - Run: `node dist/agent-worker.js`
3. Add **Web Service** component:
   - Name: `backend`
   - Build: `pnpm install && pnpm build`
   - Run: `node dist/index.js`
   - HTTP Port: 3000
4. Add environment variables to both
5. Deploy

---

### Option E: VPS (Most Control)

**Cheapest options:**
- Hetzner: €4.15/month
- Linode: $5/month
- DigitalOcean: $4/month

**Setup:**
```bash
# SSH into your VPS
ssh user@your-vps-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Clone your repo
git clone https://github.com/yourusername/your-repo.git
cd your-repo/language_learning_backend

# Install dependencies
pnpm install

# Create .env file
nano .env
# Add all your environment variables

# Build
pnpm build

# Install PM2 (process manager)
npm install -g pm2

# Start backend
pm2 start dist/index.js --name backend

# Start agent
pm2 start dist/agent-worker.js --name agent

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
```

---

## Step 3: Test Your Deployment

### Check Agent Connection:

1. **LiveKit Cloud Dashboard:**
   - Go to https://cloud.livekit.io
   - Open your project
   - Check "Agents" tab
   - You should see your agent registered

2. **Test Voice Chat:**
   - Deploy your frontend
   - Try starting a voice conversation
   - Check LiveKit dashboard for active rooms

### Verify Logs:

```bash
# Railway
railway logs

# Render
# View in Render dashboard

# Fly.io
fly logs

# PM2
pm2 logs
```

---

## Architecture

```
┌─────────────────────────┐
│   Railway/Render/Fly    │ ← Your hosting (free/cheap)
│                         │
│  ┌──────────────────┐   │
│  │  Backend API     │   │ ← Creates rooms, generates tokens
│  │  (Port 3000)     │   │
│  └──────────────────┘   │
│                         │
│  ┌──────────────────┐   │
│  │  Agent Worker    │   │ ← Handles voice conversations
│  │  (Background)    │   │    (Uses Cerebras for LLM)
│  └──────┬───────────┘   │
└─────────┼─────────────────┘
          │
          │ WebSocket
          ↓
┌─────────────────────────┐
│   LiveKit Cloud         │ ← Free tier
│   wss://xxx.livekit.io  │
│                         │
│  - Media routing        │
│  - WebRTC signaling     │
│  - Room management      │
└─────────┬───────────────┘
          │
          │ WebRTC (audio/video)
          ↓
┌─────────────────────────┐
│   Frontend (Users)      │
│   Vercel/Netlify        │
└─────────────────────────┘
```

---

## Cost Breakdown (Monthly)

**Cheapest Setup:**
- LiveKit Cloud: **$0** (free tier: 50GB traffic/month)
- Backend + Agent: **$0-5**
  - Render: Free (with sleep)
  - Fly.io: Free tier (3 shared-cpu-1x)
  - Railway: $5 (no free tier anymore)
- Cerebras API: **~$0.60** per 1M tokens
- OpenAI Whisper STT: **$0.006** per minute
- OpenAI TTS: **$15** per 1M characters

**Example for 100 conversations/month (5 min each):**
- LiveKit: $0
- Hosting: $0-5
- STT: 100 × 5 × $0.006 = $3
- TTS: ~$5
- LLM: ~$2
- **Total: $10-15/month**

---

## Scaling (When You Grow)

**Free tier limits:**
- LiveKit Cloud Free: 50GB egress/month
- ~500-1000 short conversations/month

**When to upgrade:**
1. LiveKit Cloud → Paid ($29/month for 500GB)
2. Add more agent workers (horizontal scaling)
3. Consider switching to Deepgram (cheaper STT)
4. Consider Cartesia (cheaper TTS)

---

## Troubleshooting

**Agent not showing in LiveKit dashboard:**
```bash
# Check logs for connection errors
railway logs | grep -i livekit

# Verify credentials
echo $LIVEKIT_URL
echo $LIVEKIT_API_KEY

# Test connection manually
curl -H "Authorization: Bearer $LIVEKIT_API_KEY" $LIVEKIT_URL
```

**Voice chat not working:**
1. Check browser console for errors
2. Verify frontend can reach backend API
3. Check agent logs for LLM/STT/TTS errors
4. Ensure OPENAI_API_KEY is set

**High latency:**
- Choose hosting region close to LiveKit Cloud region
- Check CPU/memory usage on agent worker
- Consider adding more agent instances

---

## Next Steps

1. ✅ Deploy to Railway/Render/Fly
2. ✅ Verify agent appears in LiveKit dashboard
3. ✅ Test voice chat from frontend
4. ⏭️ Monitor usage in LiveKit dashboard
5. ⏭️ Scale agents when needed
