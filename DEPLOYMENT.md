# Deployment Guide

## Development (Local)

### Option 1: Run Together
```bash
# Agent starts automatically with backend
pnpm dev
```

### Option 2: Run Separately (Recommended)
```bash
# Terminal 1: Backend API
pnpm dev

# Terminal 2: Agent Worker
pnpm dev:agent
```

---

## Production Deployment

### Option 1: Docker Compose (Easiest)

```bash
# Build and start both services
docker-compose up -d

# Scale agents (3 workers)
docker-compose up --scale agent=3 -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 2: Separate VMs/Containers

**Backend:**
```bash
pnpm build
NODE_ENV=production START_AGENT_WITH_BACKEND=false pnpm start
```

**Agent (separate machine):**
```bash
pnpm build
pnpm start:agent
```

### Option 3: Kubernetes

Create `k8s/` manifests:

**backend-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: language-learning-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/language-learning-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: START_AGENT_WITH_BACKEND
          value: "false"
        - name: LIVEKIT_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: livekit-url
        # ... other env vars
```

**agent-deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: language-learning-agent
spec:
  replicas: 3  # Scale as needed
  selector:
    matchLabels:
      app: agent
  template:
    metadata:
      labels:
        app: agent
    spec:
      containers:
      - name: agent
        image: your-registry/language-learning-agent:latest
        env:
        - name: LIVEKIT_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: livekit-url
        # ... other env vars
```

---

## Platform-Specific Guides

### Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Backend
railway init
railway up

# Agent (new service)
railway service create agent
railway up --service agent
```

### Deploy to Render

1. **Backend Service:**
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start`
   - Add env var: `START_AGENT_WITH_BACKEND=false`

2. **Agent Background Worker:**
   - Build Command: `pnpm install && pnpm build`
   - Start Command: `pnpm start:agent`

### Deploy to Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Backend
fly launch --dockerfile Dockerfile
fly deploy

# Agent
fly launch --dockerfile Dockerfile.agent --app language-learning-agent
fly deploy

# Scale agents
fly scale count 3 --app language-learning-agent
```

### Deploy to AWS (ECS)

1. Build images:
```bash
docker build -t backend:latest -f Dockerfile .
docker build -t agent:latest -f Dockerfile.agent .
```

2. Push to ECR
3. Create ECS task definitions for each
4. Create ECS services with auto-scaling

---

## Scaling Guidelines

**Backend API:**
- Scale based on HTTP requests
- Typical: 2-5 instances
- CPU/Memory: 512MB-1GB per instance

**Agent Workers:**
- Scale based on concurrent voice sessions
- 1 agent ≈ 5-10 concurrent sessions
- CPU/Memory: 1-2GB per instance (for STT/TTS processing)

**Example:**
- 100 concurrent users → 10-20 agent workers
- Load balancing handled automatically by LiveKit

---

## Environment Variables

Required for both services:
```bash
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
CEREBRAS_API_KEY=your-key
OPENAI_API_KEY=your-key  # For STT/TTS
```

Backend only:
```bash
PORT=3000
START_AGENT_WITH_BACKEND=false
CARTESIA_API_KEY=your-key  # Optional
```

---

## Monitoring

Check agent health:
```bash
# See LiveKit dashboard for active agents
# Each agent registers itself automatically
```

Logs:
```bash
# Docker
docker-compose logs -f agent

# Kubernetes
kubectl logs -f deployment/language-learning-agent
```

---

## Troubleshooting

**Agent not connecting:**
- Check `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Verify LiveKit server is accessible
- Check agent logs for connection errors

**No response in voice chat:**
- Verify `CEREBRAS_API_KEY` is set
- Check `OPENAI_API_KEY` for STT/TTS
- Review agent logs for LLM errors

**Performance issues:**
- Scale agent workers (more replicas)
- Monitor CPU/memory usage
- Consider dedicated STT/TTS service
