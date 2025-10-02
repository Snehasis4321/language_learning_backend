# Deploy Agent to LiveKit Cloud

## ✅ FREE TIER INCLUDES AGENT DEPLOYMENT!

LiveKit's **free "Build" plan** includes:
- ✅ 1 agent deployment
- ✅ 1,000 agent session minutes/month
- ✅ 5 concurrent agent sessions
- ✅ Deployment metrics

**This is the easiest way to deploy your agent!**

---

## Prerequisites

1. LiveKit Cloud account: https://cloud.livekit.io
2. LiveKit CLI installed
3. Agent code ready to deploy

---

## Step 1: Install LiveKit CLI

```bash
# macOS
brew install livekit-cli

# Linux/WSL
curl -sSL https://get.livekit.io/cli | bash

# Or download from: https://github.com/livekit/livekit-cli/releases
```

Verify installation:
```bash
lk --version
```

---

## Step 2: Authenticate with LiveKit Cloud

```bash
# Login to LiveKit Cloud
lk cloud auth

# This will open browser for authentication
# Follow the prompts to authenticate
```

Or set credentials manually:
```bash
export LIVEKIT_URL=wss://your-project.livekit.cloud
export LIVEKIT_API_KEY=your-api-key
export LIVEKIT_API_SECRET=your-api-secret
```

---

## Step 3: Prepare Agent for Deployment

LiveKit Cloud expects a specific structure. Create a deploy package:

### Option A: Using our existing code (needs minor adjustments)

Create `livekit.yaml` in project root:

```yaml
# livekit.yaml
agent:
  entrypoint: dist/agent/language-teacher.agent.js

  # Environment variables (don't put secrets here - add via CLI)
  env:
    NODE_ENV: production

  # Resources
  resources:
    cpu: 1
    memory: 1Gi

  # Minimum instances (0 = scale to zero)
  min_instances: 0
  max_instances: 5
```

### Option B: Simplified standalone agent

We need to make the agent work as a standalone package. The current setup is tightly coupled with the backend.

---

## Step 4: Deploy Agent

```bash
# Build TypeScript
pnpm build

# Deploy to LiveKit Cloud
lk deploy agent \
  --name language-teacher \
  --file dist/agent/language-teacher.agent.js \
  --env CEREBRAS_API_KEY=$CEREBRAS_API_KEY \
  --env OPENAI_API_KEY=$OPENAI_API_KEY \
  --env CEREBRAS_API_URL=https://api.cerebras.ai/v1

# View deployment status
lk cloud agent list

# View agent logs
lk cloud agent logs language-teacher
```

---

## Step 5: Test Your Deployed Agent

1. **Check agent status:**
   ```bash
   lk cloud agent list
   ```

2. **Create a test room:**
   ```bash
   lk room create test-room
   ```

3. **View agent logs:**
   ```bash
   lk cloud agent logs language-teacher --follow
   ```

4. **Test from your frontend:**
   - Start a voice chat session
   - The agent should automatically join

---

## Current Limitation: Our Agent Needs Refactoring

⚠️ **Our current agent is tightly coupled with the backend services.**

The agent imports:
- `cerebrasService` from `../services/cerebras.service`
- `config` from `../config/env`
- Other backend dependencies

**To deploy to LiveKit Cloud, we need to:**
1. Make the agent standalone
2. Remove backend dependencies
3. Use environment variables directly

---

## Option 1: Refactor for LiveKit Cloud Deployment

Let me create a standalone version of the agent that can be deployed to LiveKit Cloud:

**Standalone agent structure:**
```
agent-package/
├── package.json          # Minimal dependencies
├── tsconfig.json
├── livekit.yaml         # Deployment config
├── src/
│   └── index.ts         # Standalone agent entry
└── lib/
    └── cerebras.ts      # Embedded Cerebras client
```

---

## Option 2: Keep Current Setup (Self-Host)

If you prefer the current integrated setup, deploy to:
- Railway ($5/month)
- Fly.io (free tier)
- Render (free tier with sleep)

See `LIVEKIT_CLOUD_DEPLOYMENT.md` for self-hosting guide.

---

## Comparison: LiveKit Cloud vs Self-Host

| Feature | LiveKit Cloud | Self-Host |
|---------|--------------|-----------|
| **Cost** | Free (1000 min/mo) | $0-5/month |
| **Setup** | `lk deploy` | Deploy to Railway/Fly/Render |
| **Scaling** | Automatic | Manual (more instances) |
| **Cold starts** | Yes (free tier) | Depends on host |
| **Monitoring** | Built-in dashboard | Need to setup |
| **Best for** | Simple agents | Complex integrations |

---

## Recommendation

**For your current setup:**

Since your agent needs:
- Cerebras service integration
- Backend configuration
- Shared types

→ **Self-host on Railway/Fly.io** is easier for now

**When to use LiveKit Cloud deployment:**
- When agent is fully standalone
- For simpler agents without backend dependencies
- When you want automatic scaling

---

## Next Steps

Choose your path:

**A. Self-Host (Recommended for now):**
```bash
# Deploy to Fly.io
fly launch
fly secrets set LIVEKIT_URL=wss://xxx.livekit.cloud
fly secrets set LIVEKIT_API_KEY=xxx
fly secrets set LIVEKIT_API_SECRET=xxx
fly secrets set CEREBRAS_API_KEY=xxx
fly secrets set OPENAI_API_KEY=xxx
fly secrets set START_AGENT_WITH_BACKEND=true
fly deploy
```

**B. Refactor for LiveKit Cloud:**
- Create standalone agent package
- Remove backend dependencies
- Deploy with `lk deploy`

Want me to create the standalone version for LiveKit Cloud deployment?

