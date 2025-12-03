# Pre-Deployment Checklist

Complete this checklist before deploying JISA App to production.

---

## 1. Environment Configuration

### Required Environment Variables
- [ ] `NEXT_PUBLIC_APP_URL` - Production URL set
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Production Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Production anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server only)
- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `OPENAI_API_KEY` - Valid API key with sufficient quota
- [ ] `PINECONE_API_KEY` - Production Pinecone key
- [ ] `PINECONE_ENVIRONMENT` - Production environment (e.g., us-east-1)
- [ ] `PINECONE_INDEX_NAME` - Production index name
- [ ] `INNGEST_SIGNING_KEY` - Production signing key
- [ ] `INNGEST_EVENT_KEY` - Production event key

### Optional Monitoring Variables
- [ ] `SENTRY_DSN` - Server-side Sentry DSN
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Client-side Sentry DSN
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` - Analytics key (if using)

---

## 2. Database

### Schema & Migrations
- [ ] All migrations applied to production database
- [ ] Schema matches development exactly
- [ ] Indexes created for frequently queried columns
- [ ] Foreign key constraints verified

### Data Integrity
- [ ] No test data in production database
- [ ] Seed data applied (if required)
- [ ] Enums match expected values

### Backup & Recovery
- [ ] Automated backup schedule configured
- [ ] Backup tested and restorable
- [ ] Point-in-time recovery enabled (if available)

### Connection Pooling
- [ ] Connection pool configured (Supabase Pooler or PgBouncer)
- [ ] Max connections appropriate for expected load

---

## 3. Supabase

### Authentication
- [ ] Redirect URLs configured for production domain
- [ ] Email templates customized (Korean)
- [ ] Rate limiting configured
- [ ] Session expiry configured

### Row Level Security (RLS)
- [ ] RLS enabled on all sensitive tables
- [ ] Policies tested for each role
- [ ] No open policies allowing public access

### Storage
- [ ] Storage bucket created
- [ ] Bucket policies configured
- [ ] File size limits set
- [ ] Allowed MIME types configured

### Edge Functions (if used)
- [ ] All functions deployed
- [ ] Environment variables set for functions
- [ ] Functions tested in production environment

---

## 4. Pinecone

### Index Configuration
- [ ] Production index created
- [ ] Index dimension: 3072 (for text-embedding-3-large)
- [ ] Metric: cosine
- [ ] Pod type appropriate for expected scale

### Namespaces
- [ ] Namespace naming convention documented
- [ ] Organization namespaces: `org_{uuid}`
- [ ] Employee namespaces: `emp_{uuid}`

### Quotas & Limits
- [ ] Sufficient vector storage quota
- [ ] Query rate limits understood
- [ ] Billing configured

---

## 5. Inngest

### Configuration
- [ ] Production keys configured
- [ ] Webhook URL set to production domain
- [ ] Signing key matches

### Functions
- [ ] All functions deployed
- [ ] Function endpoints accessible
- [ ] Retry policies configured

### Monitoring
- [ ] Inngest dashboard access configured
- [ ] Failure alerts set up

---

## 6. Security

### API Security
- [ ] All API routes require authentication
- [ ] Role-based access control working
- [ ] Rate limiting implemented
- [ ] Input validation with Zod on all endpoints

### Headers
- [ ] Strict-Transport-Security header
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] X-XSS-Protection: 1; mode=block
- [ ] Content-Security-Policy configured

### Secrets
- [ ] No secrets in client-side code
- [ ] No secrets in git history
- [ ] Environment variables not logged

### Vulnerabilities
- [ ] `npm audit` shows no high/critical issues
- [ ] Dependencies updated
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

---

## 7. Performance

### Build Optimization
- [ ] Production build completes without errors
- [ ] Bundle size analyzed and acceptable
- [ ] Tree shaking working
- [ ] Images optimized

### Core Web Vitals
- [ ] LCP (Largest Contentful Paint) < 2.5s
- [ ] FID (First Input Delay) < 100ms
- [ ] CLS (Cumulative Layout Shift) < 0.1
- [ ] Lighthouse score > 90

### Caching
- [ ] Static assets cached appropriately
- [ ] API responses cached where appropriate
- [ ] CDN configured (Vercel Edge, Cloudflare, etc.)

---

## 8. Testing

### Unit Tests
- [ ] All unit tests passing
- [ ] Code coverage > 80%

### Integration Tests
- [ ] API integration tests passing
- [ ] Database integration tests passing

### E2E Tests
- [ ] Critical user flows tested
- [ ] Login/logout flow
- [ ] Document upload flow
- [ ] Chat flow

### Manual Testing
- [ ] All pages load correctly
- [ ] Forms submit correctly
- [ ] Error states display correctly
- [ ] Mobile responsive

---

## 9. Monitoring & Logging

### Error Tracking
- [ ] Sentry configured and receiving events
- [ ] Source maps uploaded
- [ ] Alerts configured for critical errors

### Logging
- [ ] Structured logging implemented
- [ ] Log levels appropriate
- [ ] Sensitive data not logged

### Uptime Monitoring
- [ ] Health check endpoint working
- [ ] External uptime monitoring configured
- [ ] Alert channels configured (Slack, Email)

---

## 10. Documentation

### Technical Documentation
- [ ] API documentation complete
- [ ] Database schema documented
- [ ] Environment setup documented

### Operations
- [ ] Deployment process documented
- [ ] Rollback procedure documented
- [ ] Incident response plan

### User Documentation
- [ ] User guide available
- [ ] Admin guide available
- [ ] FAQ prepared

---

## 11. Legal & Compliance

### Privacy
- [ ] Privacy policy in place
- [ ] Data handling documented
- [ ] User consent mechanisms

### Terms
- [ ] Terms of service in place
- [ ] Acceptable use policy

### Data Retention
- [ ] Retention policy defined
- [ ] Deletion procedures documented

---

## 12. Final Checks

### Deployment
- [ ] Staging environment tested
- [ ] Rollback plan ready
- [ ] Team notified of deployment
- [ ] Support channels ready

### Post-Deployment Plan
- [ ] Post-deployment verification steps documented
- [ ] Monitoring dashboard ready
- [ ] On-call person identified

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| DevOps | | | |
| Product Owner | | | |

---

## Deployment Notes

**Target Environment:**
- [ ] Vercel
- [ ] AWS
- [ ] Other: __________

**Deployment Date/Time:** ___________

**Version:** ___________

**Special Instructions:**
```
(Add any special deployment instructions here)
```

---

## Post-Deployment Verification

After deployment, verify:

1. [ ] Application accessible at production URL
2. [ ] `/api/health` returns healthy status
3. [ ] Login flow works
4. [ ] Main features work (quick smoke test)
5. [ ] No errors in Sentry
6. [ ] Logs show normal operation
7. [ ] Performance metrics acceptable

If any check fails, execute rollback procedure immediately.
