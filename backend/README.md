# JISA KakaoTalk Backend

> **LEGACY - DO NOT DEPLOY**
>
> This Express.js backend has been **fully migrated to Next.js API routes**.
> The backend folder is kept for historical reference only.
>
> **Active implementation**: `/app/api/kakao/chat/route.ts`
>
> See [DEPLOYMENT.md](../DEPLOYMENT.md) for the single-service Vercel deployment guide.

---

## Migration Map

| Original (Express) | Migrated To (Next.js) |
|--------------------|----------------------|
| `src/routes/kakao.route.ts` | `app/api/kakao/chat/route.ts` |
| `src/services/chat.service.ts` | `lib/services/kakao/chat.service.ts` |
| `src/services/rag.service.ts` | `lib/services/kakao/rag.service.ts` |
| `src/services/employee-rag.service.ts` | `lib/services/kakao/employee-rag.service.ts` |
| `src/services/rbac.service.ts` | `lib/services/kakao/rbac.service.ts` |
| `src/services/commission-detector.service.ts` | `lib/services/kakao/commission-detector.service.ts` |
| `src/config/metadata_key.json` | `lib/config/metadata-key.json` |
| `src/config/pdf_urls.json` | `lib/config/pdf-urls.json` |
| `src/types/index.ts` | `lib/types/kakao.ts` |

---

## Original Documentation (for reference)

A standalone Express.js backend for handling KakaoTalk webhook communication for the JISA Insurance HR/Information System.

## Overview

This backend provides a gated chatbot experience through KakaoTalk:
1. Public KakaoTalk channel (anyone can add the bot)
2. First message must be a verification code
3. Code determines access level (role + subscription tier)
4. All subsequent queries are filtered by RBAC
5. All interactions are logged to Supabase

## Features

- **KakaoTalk Webhook Handler**: Receives and processes messages from KakaoTalk
- **Verification System**: Validates access codes and creates user profiles
- **RAG System**: Retrieval-Augmented Generation using Pinecone and Gemini
- **Employee RAG**: Isolated namespace for employee-specific compensation data
- **Commission Detection**: Pattern-based detection of insurance commission queries
- **RBAC**: Role-Based Access Control with hierarchical permissions

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Database**: Supabase (PostgreSQL)
- **Vector DB**: Pinecone
- **AI**: Google Gemini, OpenAI Embeddings

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration and metadata
│   │   ├── index.ts      # Environment config loader
│   │   ├── metadata_key.json
│   │   └── pdf_urls.json
│   ├── routes/           # Express routes
│   │   └── kakao.route.ts
│   ├── services/         # Business logic
│   │   ├── chat.service.ts
│   │   ├── rag.service.ts
│   │   ├── employee-rag.service.ts
│   │   ├── rbac.service.ts
│   │   └── commission-detector.service.ts
│   ├── middleware/       # Express middleware
│   ├── utils/            # Utilities
│   │   └── supabase.ts
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   └── server.ts         # Entry point
├── logs/                 # Log files
├── .env                  # Environment variables
├── .env.example          # Example environment
├── package.json
├── tsconfig.json
└── README.md
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment file:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`

## Development

Start the development server with hot reload:
```bash
npm run dev
```

## Production

Build the TypeScript:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## API Endpoints

### Health Check
```
GET /health
GET /api/kakao/health
```

### KakaoTalk Webhook
```
POST /api/kakao/chat
```

Request body (KakaoTalk v2.0 format):
```json
{
  "userRequest": {
    "utterance": "사용자 메시지",
    "user": {
      "id": "kakao_user_id",
      "properties": {
        "nickname": "사용자닉네임"
      }
    },
    "callbackUrl": "https://callback.url/for/async"
  }
}
```

Response (KakaoTalk v2.0 format):
```json
{
  "version": "2.0",
  "template": {
    "outputs": [{
      "simpleText": {
        "text": "응답 메시지"
      }
    }],
    "quickReplies": [
      {
        "action": "message",
        "label": "버튼 라벨",
        "messageText": "클릭시 보내는 메시지"
      }
    ]
  }
}
```

## User Flow

1. **New User**: Must send verification code (e.g., `HXK-9F2-M7Q-3WP`)
2. **Verification**: Code is validated against `verification_codes` table
3. **Profile Creation**: User profile created with role/tier from code
4. **Query Processing**: Messages routed through:
   - Employee RAG (if starts with `/`)
   - Commission System (if commission keywords detected)
   - General RAG (default)
5. **RBAC Filtering**: Results filtered by user's role and tier

## Role Hierarchy

```
CEO > Admin > Manager > Senior > Junior > User
```

## Subscription Tiers

```
Enterprise > Pro > Basic > Free
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Environment (development/production) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `OPENAI_API_KEY` | OpenAI API key |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX` | Pinecone index name |

## Special Commands

- `/delete` or `/삭제`: Delete user profile and auth user
- `/` prefix: Query employee-specific compensation data

## Logging

All interactions are logged to:
- `query_logs`: Query text, response, timing, metadata
- `analytics_events`: User verification, queries, access attempts

## License

MIT
