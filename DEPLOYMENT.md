# ContractorHub Deployment Guide

Complete guide for deploying ContractorHub with KakaoTalk webhook and Pinecone integration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Vercel     │     │   Railway    │     │   Supabase   │    │
│  │  (Next.js)   │     │  (Express)   │     │  (Database)  │    │
│  │  Port: 443   │     │  Port: 3001  │     │  PostgreSQL  │    │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘    │
│         │                    │                    │             │
│         │    ┌───────────────┼────────────────────┤             │
│         │    │               │                    │             │
│         ▼    ▼               ▼                    ▼             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │   Inngest    │     │   Pinecone   │     │   OpenAI     │    │
│  │  (Jobs)      │     │  (Vectors)   │     │ (Embeddings) │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│                              │                                  │
│                              ▼                                  │
│                       ┌──────────────┐                         │
│                       │   KakaoTalk  │                         │
│                       │  (Webhooks)  │                         │
│                       └──────────────┘                         │
└─────────────────────────────────────────────────────────────────┘
```

### Two Services to Deploy

| Service | Platform | Purpose |
|---------|----------|---------|
| **Next.js App** | Vercel | Admin dashboard, API routes, Inngest |
| **Express Backend** | Railway/Render | KakaoTalk webhooks, RAG/Pinecone |

---

## Part 1: Supabase Setup (Database)

Your Supabase project is already configured. Ensure migrations are applied:

```bash
# Apply all migrations to production
npm run db:migrate

# Seed required data
npm run db:seed
npm run db:seed:templates
npm run db:seed:prompts
```

### Verify Database Connection

```bash
# Test connection (uses DATABASE_URL from .env.local)
npm run db:studio
```

---

## Part 2: Pinecone Setup (Vector Database)

### 2.1 Create Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new index with these settings:

```yaml
Name: contractorhub-prod  # or your preferred name
Dimensions: 3072          # Required for text-embedding-3-large
Metric: cosine
Cloud: AWS
Region: us-east-1         # Choose closest to your users
```

### 2.2 Get API Credentials

From Pinecone Console → API Keys:
- Copy `PINECONE_API_KEY`
- Note your index name for `PINECONE_INDEX_NAME`

---

## Part 3: Deploy Next.js to Vercel

### 3.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 3.2 Login and Link Project

```bash
# Login to Vercel
vercel login

# Link to project (from project root)
cd /Users/kjyoo/jisa_v4
vercel link
```

### 3.3 Configure Environment Variables

```bash
# Add all required environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
vercel env add PINECONE_API_KEY
vercel env add PINECONE_INDEX_NAME
vercel env add OPENAI_API_KEY
vercel env add GEMINI_API_KEY
vercel env add INNGEST_SIGNING_KEY
vercel env add INNGEST_EVENT_KEY
```

Or use Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Environment |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yuuqflpiojcocchjrpeo.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | All |
| `DATABASE_URL` | `postgresql://...` | All |
| `PINECONE_API_KEY` | Your Pinecone API key | All |
| `PINECONE_INDEX_NAME` | `contractorhub-prod` | All |
| `OPENAI_API_KEY` | Your OpenAI key | All |
| `GEMINI_API_KEY` | Your Gemini key | All |
| `INNGEST_SIGNING_KEY` | From Inngest dashboard | All |
| `INNGEST_EVENT_KEY` | From Inngest dashboard | All |

### 3.4 Deploy

```bash
# Deploy to production
vercel --prod

# Or deploy preview first
vercel
```

### 3.5 Configure Inngest

1. Go to [Inngest Dashboard](https://app.inngest.com/)
2. Create a new app or select existing
3. Get your signing key and event key
4. Add your Vercel URL as the app URL:
   ```
   https://your-app.vercel.app/api/inngest
   ```

---

## Part 4: Deploy Express Backend to Railway

Railway is recommended for the Express backend because:
- Always-on servers (required for webhooks)
- Easy environment variable management
- Auto-deploy from GitHub

### 4.1 Prepare Backend for Deployment

Create a `Dockerfile` in the backend directory:

```bash
cd backend
```

```dockerfile
# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "run", "start:prod"]
```

Create `backend/.dockerignore`:

```
node_modules
dist
.env
.env.*
*.log
.git
```

### 4.2 Create Railway Project

1. Go to [Railway](https://railway.app/)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository: `vonaer2027/jisa-v4`
4. Configure the service:

```yaml
# Railway Settings
Root Directory: backend
Build Command: npm run build
Start Command: npm run start:prod
```

### 4.3 Configure Environment Variables in Railway

In Railway Dashboard → Variables:

```env
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://yuuqflpiojcocchjrpeo.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI APIs
GEMINI_API_KEY=your_gemini_key
OPENAI_API_KEY=your_openai_key

# Pinecone
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=contractorhub-prod

# KakaoTalk (if using)
KAKAO_ADMIN_KEY=your_kakao_admin_key
KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

### 4.4 Get Your Railway URL

After deployment, Railway provides a URL like:
```
https://jisa-kakao-backend-production.up.railway.app
```

This is your **KakaoTalk webhook URL**.

---

## Part 5: Alternative - Deploy Backend to Render

If you prefer Render over Railway:

### 5.1 Create render.yaml

```yaml
# backend/render.yaml
services:
  - type: web
    name: jisa-kakao-backend
    env: node
    rootDir: backend
    buildCommand: npm install && npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3001
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: OPENAI_API_KEY
        sync: false
      - key: PINECONE_API_KEY
        sync: false
      - key: PINECONE_INDEX
        sync: false
```

### 5.2 Deploy to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New" → "Web Service"
3. Connect your GitHub repo
4. Set root directory to `backend`
5. Configure environment variables
6. Deploy

---

## Part 6: KakaoTalk Webhook Configuration

### 6.1 Register KakaoTalk Channel

1. Go to [Kakao Developers](https://developers.kakao.com/)
2. Create an application
3. Enable "KakaoTalk Channel" in Products
4. Link your KakaoTalk Channel

### 6.2 Configure Webhook URL

In Kakao Developers → Your App → KakaoTalk Channel → Webhook:

```
Webhook URL: https://your-railway-url.up.railway.app/api/kakao/chat
```

Or if using the legacy route:
```
Webhook URL: https://your-railway-url.up.railway.app/kakao/chat
```

### 6.3 Verify Webhook

Test the health endpoint:

```bash
curl https://your-railway-url.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "jisa-kakao-backend",
  "version": "1.0.0",
  "environment": "production"
}
```

### 6.4 Test KakaoTalk Integration

```bash
# Test the chat endpoint
curl -X POST https://your-railway-url.up.railway.app/api/kakao/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": {
      "user": { "id": "test-user" },
      "utterance": "안녕하세요"
    }
  }'
```

---

## Part 7: Environment Variables Reference

### Next.js App (Vercel)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://yuuqflpiojcocchjrpeo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

# Pinecone
PINECONE_API_KEY=pc-...
PINECONE_INDEX_NAME=contractorhub-prod

# OpenAI (for embeddings)
OPENAI_API_KEY=sk-...

# Gemini (for LLM)
GEMINI_API_KEY=AIza...

# Inngest (for background jobs)
INNGEST_SIGNING_KEY=signkey-...
INNGEST_EVENT_KEY=...
```

### Express Backend (Railway/Render)

```env
NODE_ENV=production
PORT=3001

# Supabase
SUPABASE_URL=https://yuuqflpiojcocchjrpeo.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI APIs
GEMINI_API_KEY=AIza...
OPENAI_API_KEY=sk-...

# Pinecone
PINECONE_API_KEY=pc-...
PINECONE_INDEX=contractorhub-prod

# KakaoTalk
KAKAO_ADMIN_KEY=...
KAKAO_REST_API_KEY=...
```

---

## Part 8: Post-Deployment Verification

### 8.1 Verify Next.js App

```bash
# Check app is running
curl https://your-app.vercel.app/api/health

# Check Inngest endpoint
curl https://your-app.vercel.app/api/inngest
```

### 8.2 Verify Express Backend

```bash
# Health check
curl https://your-railway-url.up.railway.app/health

# Root info
curl https://your-railway-url.up.railway.app/

# KakaoTalk endpoint
curl https://your-railway-url.up.railway.app/api/kakao/health
```

### 8.3 Verify Pinecone Connection

```bash
# Test from backend
curl -X POST https://your-railway-url.up.railway.app/api/kakao/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": {
      "user": { "id": "test" },
      "utterance": "MDRT 기준이 뭐야?"
    }
  }'
```

### 8.4 Monitor Logs

**Vercel:**
```bash
vercel logs --follow
```

**Railway:**
- View logs in Railway Dashboard → Deployments → View Logs

---

## Part 9: Domain Configuration (Optional)

### Custom Domain for Next.js (Vercel)

1. Vercel Dashboard → Settings → Domains
2. Add your domain: `app.yourdomain.com`
3. Configure DNS at your registrar

### Custom Domain for Backend (Railway)

1. Railway Dashboard → Settings → Networking
2. Add custom domain
3. Configure DNS CNAME record

---

## Part 10: Troubleshooting

### Common Issues

**1. Pinecone Connection Failed**
```
Error: Failed to connect to Pinecone
```
- Verify `PINECONE_API_KEY` is correct
- Check index name matches `PINECONE_INDEX_NAME`
- Ensure index dimensions are 3072

**2. KakaoTalk Webhook Not Responding**
```
Error: Webhook verification failed
```
- Ensure backend is running and accessible
- Verify webhook URL in Kakao Developers console
- Check CORS settings allow Kakao servers

**3. Database Connection Error**
```
Error: Connection refused to PostgreSQL
```
- Verify `DATABASE_URL` format is correct
- Check Supabase project is not paused
- Ensure connection pooling is configured

**4. Inngest Jobs Not Running**
```
Error: No Inngest events received
```
- Verify Inngest app URL is set correctly
- Check signing key matches
- Ensure `/api/inngest` route is accessible

### Debug Commands

```bash
# Check environment variables
vercel env ls

# View Railway logs
railway logs

# Test Supabase connection
npx supabase status

# Test Pinecone
curl -H "Api-Key: YOUR_KEY" \
  https://YOUR_INDEX-YOUR_PROJECT.svc.YOUR_REGION.pinecone.io/describe_index_stats
```

---

## Deployment Checklist

- [ ] Supabase migrations applied
- [ ] Pinecone index created (3072 dimensions)
- [ ] Next.js deployed to Vercel
- [ ] Environment variables set in Vercel
- [ ] Inngest app configured
- [ ] Express backend deployed to Railway/Render
- [ ] Environment variables set in Railway/Render
- [ ] KakaoTalk webhook URL configured
- [ ] Health endpoints verified
- [ ] End-to-end chat test passed

---

## Quick Deploy Commands

```bash
# 1. Deploy Next.js to Vercel
vercel --prod

# 2. Deploy backend to Railway (after git push)
git add .
git commit -m "chore: prepare for deployment"
git push origin main

# Railway auto-deploys from GitHub

# 3. Verify deployments
curl https://your-app.vercel.app/api/health
curl https://your-backend.railway.app/health
```

---

## Cost Estimates

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Vercel | 100GB bandwidth | $20/mo Pro |
| Railway | $5 credit/mo | ~$5-20/mo |
| Supabase | 500MB database | $25/mo Pro |
| Pinecone | 1 index, 100K vectors | $70/mo Standard |
| OpenAI | Pay per use | ~$0.0001/1K tokens |
| Gemini | Free tier available | Pay per use |
| Inngest | 5K runs/mo | $25/mo Pro |

**Estimated Monthly Cost**: $50-150/month for production use
