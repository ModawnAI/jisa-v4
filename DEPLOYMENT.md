# ContractorHub Deployment Guide

Complete guide for deploying ContractorHub with KakaoTalk webhook and Pinecone integration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      Vercel (Next.js)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │   │
│  │  │  Admin UI   │  │  API Routes │  │   Inngest   │       │   │
│  │  │  Dashboard  │  │  /api/*     │  │   /api/     │       │   │
│  │  └─────────────┘  └──────┬──────┘  └─────────────┘       │   │
│  │                          │                                 │   │
│  │              ┌───────────┼───────────┐                    │   │
│  │              │           │           │                    │   │
│  │              ▼           ▼           ▼                    │   │
│  │  ┌─────────────┐  ┌───────────┐  ┌─────────────┐        │   │
│  │  │  KakaoTalk  │  │  Pinecone │  │   OpenAI    │        │   │
│  │  │  Webhook    │  │  (RAG)    │  │ (Embeddings)│        │   │
│  │  │ /api/kakao  │  └───────────┘  └─────────────┘        │   │
│  │  └─────────────┘                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Supabase (Database)                     │   │
│  │       PostgreSQL + Auth + Storage + Realtime              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Single Service Architecture

All functionality is consolidated into a **single Next.js deployment** on Vercel:

| Component | Route | Purpose |
|-----------|-------|---------|
| Admin Dashboard | `/admin/*` | UI for managing employees, documents, templates |
| KakaoTalk Webhook | `/api/kakao/chat` | Handle chatbot messages with RAG |
| Document API | `/api/documents/*` | Upload, process, and query documents |
| Inngest | `/api/inngest` | Background job processing |

**Your webhook URL**: `https://jisa.flowos.work/api/kakao/chat`

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

## Part 3: Deploy to Vercel

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

### 3.4 Configure vercel.json

The project includes `vercel.json` with optimized settings for KakaoTalk webhooks:

```json
{
  "framework": "nextjs",
  "regions": ["icn1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    },
    "app/api/inngest/route.ts": {
      "maxDuration": 300
    }
  }
}
```

- **Region `icn1`**: Seoul (closest to Korean users)
- **60s timeout**: Extended timeout for RAG + LLM processing
- **300s for Inngest**: Long-running background jobs

### 3.5 Deploy

```bash
# Deploy to production
vercel --prod

# Or deploy preview first
vercel
```

### 3.6 Configure Custom Domain

Since you're using `jisa.flowos.work`:

1. Vercel Dashboard → Settings → Domains
2. Add: `jisa.flowos.work`
3. Configure DNS at your registrar (CNAME to `cname.vercel-dns.com`)

### 3.7 Configure Inngest

1. Go to [Inngest Dashboard](https://app.inngest.com/)
2. Create a new app or select existing
3. Get your signing key and event key
4. Add your Vercel URL as the app URL:
   ```
   https://jisa.flowos.work/api/inngest
   ```

---

## Part 4: KakaoTalk Webhook Configuration

### 4.1 Register KakaoTalk Channel

1. Go to [Kakao Developers](https://developers.kakao.com/)
2. Create an application
3. Enable "KakaoTalk Channel" in Products
4. Link your KakaoTalk Channel

### 4.2 Configure Webhook URL

In Kakao Developers → Your App → KakaoTalk Channel → Webhook:

```
Webhook URL: https://jisa.flowos.work/api/kakao/chat
```

### 4.3 Test KakaoTalk Integration

```bash
# Test the chat endpoint
curl -X POST https://jisa.flowos.work/api/kakao/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": {
      "user": { "id": "test-user" },
      "utterance": "안녕하세요"
    }
  }'
```

Expected response format:
```json
{
  "version": "2.0",
  "template": {
    "outputs": [
      {
        "simpleText": {
          "text": "AI 응답 내용..."
        }
      }
    ]
  }
}
```

---

## Part 5: Environment Variables Reference

All environment variables are set in Vercel:

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

---

## Part 6: Post-Deployment Verification

### 6.1 Verify App Health

```bash
# Check app is running
curl https://jisa.flowos.work

# Check API routes
curl https://jisa.flowos.work/api/health
```

### 6.2 Verify KakaoTalk Webhook

```bash
# Test RAG query
curl -X POST https://jisa.flowos.work/api/kakao/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userRequest": {
      "user": { "id": "test" },
      "utterance": "MDRT 기준이 뭐야?"
    }
  }'
```

### 6.3 Verify Pinecone Connection

The RAG query above will test Pinecone. You can also verify directly:

```bash
curl -H "Api-Key: YOUR_PINECONE_KEY" \
  https://YOUR_INDEX-YOUR_PROJECT.svc.YOUR_REGION.pinecone.io/describe_index_stats
```

### 6.4 Monitor Logs

```bash
# View Vercel logs
vercel logs --follow

# Or use Vercel Dashboard → Deployments → View Logs
```

---

## Part 7: Troubleshooting

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
- Verify webhook URL in Kakao Developers console
- Check that `/api/kakao/chat` returns proper KakaoTalk format
- Ensure function timeout is set (60s in vercel.json)

**3. Database Connection Error**
```
Error: Connection refused to PostgreSQL
```
- Verify `DATABASE_URL` format is correct
- Check Supabase project is not paused
- Ensure connection pooling is configured (use pooler URL)

**4. Inngest Jobs Not Running**
```
Error: No Inngest events received
```
- Verify Inngest app URL is set correctly
- Check signing key matches
- Ensure `/api/inngest` route is accessible

**5. Function Timeout**
```
Error: Task timed out after 10s
```
- Ensure `vercel.json` has `maxDuration: 60` for API routes
- Check if RAG query is too complex
- Consider using callback URL for long operations

### Debug Commands

```bash
# Check environment variables
vercel env ls

# Pull env vars to local
vercel env pull .env.local

# Test locally with production env
npm run dev

# Check Supabase connection
npx supabase status
```

---

## Deployment Checklist

- [ ] Supabase migrations applied (`npm run db:migrate`)
- [ ] Pinecone index created (3072 dimensions)
- [ ] Environment variables set in Vercel
- [ ] Deploy to Vercel (`vercel --prod`)
- [ ] Custom domain configured (`jisa.flowos.work`)
- [ ] Inngest app configured with correct URL
- [ ] KakaoTalk webhook URL configured
- [ ] Test chat endpoint verified
- [ ] RAG query test passed

---

## Quick Deploy Commands

```bash
# 1. Ensure database is up to date
npm run db:migrate

# 2. Deploy to Vercel
vercel --prod

# 3. Verify deployment
curl https://jisa.flowos.work/api/kakao/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"userRequest":{"user":{"id":"test"},"utterance":"테스트"}}'
```

---

## Cost Estimates

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Vercel | 100GB bandwidth | $20/mo Pro |
| Supabase | 500MB database | $25/mo Pro |
| Pinecone | 1 index, 100K vectors | $70/mo Standard |
| OpenAI | Pay per use | ~$0.0001/1K tokens |
| Gemini | Free tier available | Pay per use |
| Inngest | 5K runs/mo | $25/mo Pro |

**Estimated Monthly Cost**: $25-100/month for production use

---

## Legacy Backend Reference

The `backend/` directory contains the original Express.js implementation. This has been fully migrated to Next.js API routes. The backend folder is kept for reference but is not deployed.

**Migrated Components**:
- `backend/src/routes/kakao.ts` → `app/api/kakao/chat/route.ts`
- `backend/src/services/chat.service.ts` → `lib/services/kakao/chat.service.ts`
- `backend/src/services/rag.service.ts` → `lib/services/kakao/rag.service.ts`
- `backend/src/config/*.json` → `lib/config/*.json`
