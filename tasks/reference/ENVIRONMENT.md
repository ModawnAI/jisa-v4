# Environment Setup Reference

Complete environment configuration for JISA App.

---

## Required Environment Variables

### Application
```env
# App URL (required for redirects, CORS)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Supabase Configuration
```env
# Supabase Project URL
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co

# Supabase Anonymous Key (public, safe for client)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Supabase Service Role Key (server only, never expose to client)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Direct Database Connection (for Drizzle migrations)
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
```

### AI/ML Services
```env
# OpenAI (for embeddings: text-embedding-3-large)
OPENAI_API_KEY=sk-...

# Google Gemini (for document processing)
GOOGLE_API_KEY=AIza...

# Pinecone Vector Database
PINECONE_API_KEY=pcsk_...
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=jisa-knowledge
```

### Background Jobs
```env
# Inngest (for async processing)
INNGEST_SIGNING_KEY=signkey-...
INNGEST_EVENT_KEY=eventkey-...
```

---

## Optional Environment Variables

### Monitoring & Analytics
```env
# Sentry Error Tracking
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### Development
```env
# Enable debug logging
DEBUG=true

# Skip email verification in development
SKIP_EMAIL_VERIFICATION=true
```

---

## Environment File Template

### `.env.local` (Development)
```env
# ===========================================
# JISA App - Development Environment
# ===========================================

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# AI Services
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

# Vector Database
PINECONE_API_KEY=pcsk_...
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=jisa-knowledge-dev

# Background Jobs
INNGEST_SIGNING_KEY=signkey-...
INNGEST_EVENT_KEY=eventkey-...

# Development Options
DEBUG=true
```

### `.env.production` (Production)
```env
# ===========================================
# JISA App - Production Environment
# ===========================================

# Application
NEXT_PUBLIC_APP_URL=https://jisa-app.vercel.app

# Supabase (Production Project)
NEXT_PUBLIC_SUPABASE_URL=https://[prod-project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
DATABASE_URL=postgresql://postgres:[password]@db.[prod-project-id].supabase.co:5432/postgres

# AI Services
OPENAI_API_KEY=sk-...
GOOGLE_API_KEY=AIza...

# Vector Database (Production Index)
PINECONE_API_KEY=pcsk_...
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=jisa-knowledge-prod

# Background Jobs
INNGEST_SIGNING_KEY=signkey-...
INNGEST_EVENT_KEY=eventkey-...

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
```

---

## Supabase Setup

### 1. Create Project
```bash
# Via Supabase CLI
npx supabase init
npx supabase start  # Local development

# Or create at https://supabase.com/dashboard
```

### 2. Configure Authentication
```sql
-- Enable email auth (default)
-- Configure in Supabase Dashboard > Authentication > Providers

-- Set redirect URLs
-- Add to Supabase Dashboard > Authentication > URL Configuration:
-- Site URL: http://localhost:3000 (dev) or https://your-domain.com (prod)
-- Redirect URLs:
--   http://localhost:3000/auth/callback
--   https://your-domain.com/auth/callback
```

### 3. Storage Buckets
```sql
-- Create document storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Storage policy for authenticated users
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view own org documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.jwt() ->> 'organization_id'
);
```

### 4. Row Level Security
```sql
-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ... etc

-- Example policy
CREATE POLICY "Users can view own organization employees"
ON employees FOR SELECT
TO authenticated
USING (organization_id = auth.jwt() ->> 'organization_id');
```

---

## Pinecone Setup

### 1. Create Index
```bash
# Via Pinecone Console or API
# Index Configuration:
#   Name: jisa-knowledge
#   Dimensions: 3072 (for text-embedding-3-large)
#   Metric: cosine
#   Pod Type: p1.x1 (starter) or s1.x1 (production)
```

### 2. Index Configuration
```typescript
// lib/pinecone.ts
import { Pinecone } from "@pinecone-database/pinecone";

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export const getIndex = () => {
  return pinecone.index(process.env.PINECONE_INDEX_NAME!);
};

// Namespace conventions:
// - Company documents: org_{organization_id}
// - Employee-specific: emp_{employee_id}
```

### 3. Verify Connection
```typescript
// Test script
const index = getIndex();
const stats = await index.describeIndexStats();
console.log("Index stats:", stats);
// Should show: { dimension: 3072, namespaces: {...} }
```

---

## Inngest Setup

### 1. Install and Configure
```bash
npm install inngest
```

### 2. Create Client
```typescript
// lib/inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "jisa-app",
  name: "JISA App",
});
```

### 3. API Route Handler
```typescript
// app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processDocument } from "@/lib/inngest/functions/process-document";
import { syncKnowledge } from "@/lib/inngest/functions/sync-knowledge";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processDocument, syncKnowledge],
});
```

### 4. Webhook Configuration
```
# Inngest Dashboard > App Settings
# Webhook URL: https://your-domain.com/api/inngest
```

---

## Development Commands

### Initial Setup
```bash
# Clone and install
git clone <repo-url>
cd jisa-app
npm install

# Copy environment file
cp .env.example .env.local

# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed

# Start development server
npm run dev
```

### Database Commands
```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Push schema directly (dev only)
npm run db:push

# Open Drizzle Studio
npm run db:studio

# Seed database
npm run db:seed
```

### Build & Deploy
```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Build production
npm run build

# Start production server
npm start
```

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev --turbo",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx scripts/seed.ts",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

---

## Vercel Deployment

### 1. Environment Variables
```
# Vercel Dashboard > Project > Settings > Environment Variables
# Add all production environment variables
```

### 2. Build Settings
```json
// vercel.json (optional)
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "installCommand": "npm install"
}
```

### 3. Domain Configuration
```
# Vercel Dashboard > Project > Settings > Domains
# Add custom domain and configure DNS
```

---

## Troubleshooting

### Common Issues

#### Supabase Connection Failed
```
Error: relation "employees" does not exist
```
**Solution**: Run migrations with `npm run db:migrate`

#### Pinecone Dimension Mismatch
```
Error: Vector dimension 1536 does not match index dimension 3072
```
**Solution**: Ensure using `text-embedding-3-large` (3072 dim), not `text-embedding-3-small` (1536)

#### Inngest Functions Not Triggering
```
Error: Function not found
```
**Solution**:
1. Check webhook URL in Inngest Dashboard
2. Verify function is exported in route handler
3. Check signing key matches

#### Environment Variable Not Found
```
Error: NEXT_PUBLIC_SUPABASE_URL is not defined
```
**Solution**:
1. Ensure `.env.local` exists
2. Restart dev server after adding env vars
3. For Vercel, add to Environment Variables in dashboard

---

## Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never exposed to client
- [ ] All `NEXT_PUBLIC_*` vars are safe for public exposure
- [ ] `.env.local` is in `.gitignore`
- [ ] Production keys are different from development
- [ ] API keys have appropriate rate limits
- [ ] Database connection uses connection pooling in production
