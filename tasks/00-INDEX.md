# ContractorHub 구현 태스크 마스터 인덱스

> **프로젝트**: ContractorHub (계약자허브)
> **버전**: v2.0
> **생성일**: 2025-12-02
> **기반 문서**: /REDESIGN_PROPOSAL.md

---

## 프로젝트 개요

카카오톡 챗봇을 통한 계약자 보상 계산 및 온보딩 시스템

### 핵심 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | Next.js 16 (App Router) + React 19 |
| 스타일링 | Tailwind CSS v4 + Radix UI + shadcn/ui |
| 아이콘 | Phosphor Icons (lucide에서 변경 필요) |
| 폰트 | Noto Sans KR |
| 데이터베이스 | Supabase PostgreSQL + Drizzle ORM |
| 인증 | Supabase Auth |
| 스토리지 | Supabase Storage |
| 벡터 DB | Pinecone (3072차원) |
| 임베딩 | OpenAI text-embedding-3-large |
| LLM | Google Gemini Flash |
| 백그라운드 | Inngest |
| 실시간 | Fly.io WebSocket 사이드카 |
| 채팅 | KakaoTalk 웹훅 API v2.0 |
| 모니터링 | Sentry + PostHog + Vercel Analytics |

---

## 디렉토리 구조

```
/tasks/
├── 00-INDEX.md                    # 이 파일 (마스터 인덱스)
│
├── standards/                      # 표준 및 컨벤션
│   ├── CONVENTIONS.md             # 코딩 컨벤션, 네이밍, 구조
│   ├── UI-PATTERNS.md             # UI/UX 패턴, 컴포넌트 가이드
│   ├── TESTING.md                 # 테스팅 전략 및 가이드라인
│   └── ERROR-HANDLING.md          # 에러 처리 표준
│
├── phases/                         # 구현 단계별 태스크
│   ├── PHASE-00-FOUNDATION.md     # 프로젝트 셋업
│   ├── PHASE-01-DATABASE.md       # 데이터베이스 스키마
│   ├── PHASE-02-AUTH.md           # 인증 시스템
│   ├── PHASE-03-CATEGORIES.md     # 동적 카테고리
│   ├── PHASE-04-EMPLOYEES.md      # 직원 관리
│   ├── PHASE-05-TEMPLATES.md      # 템플릿 시스템
│   ├── PHASE-06-DOCUMENTS.md      # 문서 처리
│   ├── PHASE-07-PINECONE.md       # Pinecone 통합
│   ├── PHASE-08-INNGEST.md        # 백그라운드 작업
│   ├── PHASE-09-RAG.md            # RAG 쿼리 시스템
│   ├── PHASE-10-KAKAO.md          # 카카오톡 통합
│   ├── PHASE-11-DASHBOARD.md      # 관리자 대시보드
│   ├── PHASE-12-WEBSOCKET.md      # Fly.io WebSocket
│   └── PHASE-13-POLISH.md         # 최종 폴리싱
│
├── progress/                       # 진행 추적
│   ├── TRACKER.md                 # 전체 진행률
│   └── DAILY-LOG.md               # 일일 작업 로그
│
└── checklists/                     # 체크리스트
    ├── PRE-DEPLOY.md              # 배포 전 점검
    ├── SECURITY-AUDIT.md          # 보안 감사
    └── PERFORMANCE.md             # 성능 체크리스트
```

---

## 구현 로드맵

### Phase 0: Foundation (1-2일)
- [ ] 프로젝트 초기화 및 의존성 설치
- [ ] 폴더 구조 셋업
- [ ] 환경 변수 설정
- [ ] 기본 설정 파일 생성

### Phase 1: Database (2-3일)
- [ ] Drizzle ORM 설정
- [ ] 전체 스키마 정의
- [ ] 마이그레이션 시스템 구축
- [ ] 시드 데이터 생성

### Phase 2: Auth (2일)
- [ ] Supabase Auth 통합
- [ ] 미들웨어 구현
- [ ] 역할 기반 접근 제어

### Phase 3: Categories (2일)
- [ ] 동적 카테고리 CRUD
- [ ] 계층 구조 관리
- [ ] 카테고리 관리 UI

### Phase 4: Employees (2-3일)
- [ ] 직원 CRUD API
- [ ] 직원 관리 UI
- [ ] 권한 레벨 관리

### Phase 5: Templates (3-4일)
- [ ] 템플릿 정의 스키마
- [ ] 컬럼 매핑 시스템
- [ ] 템플릿 관리 UI
- [ ] 버전 관리

### Phase 6: Documents (3-4일)
- [ ] 파일 업로드 처리
- [ ] Excel 파싱 시스템
- [ ] 미리보기 기능
- [ ] 충돌 감지/해결

### Phase 7: Pinecone (2-3일)
- [ ] Pinecone 클라이언트 설정
- [ ] 듀얼 네임스페이스 전략
- [ ] 메타데이터 스키마
- [ ] 업서트/삭제 로직

### Phase 8: Inngest (3-4일)
- [ ] Inngest 설정
- [ ] 문서 처리 함수
- [ ] 크론 작업 (만료 처리)
- [ ] 에러 핸들링 및 재시도

### Phase 9: RAG (3-4일)
- [ ] 쿼리 라우터 구현
- [ ] 임베딩 생성
- [ ] 컨텍스트 생성
- [ ] 응답 생성 (Gemini)

### Phase 10: KakaoTalk (3-4일)
- [ ] 웹훅 엔드포인트
- [ ] 사용자 인증 플로우
- [ ] 메시지 처리
- [ ] 응답 포맷팅

### Phase 11: Dashboard (4-5일)
- [ ] 레이아웃 및 네비게이션
- [ ] 분석 대시보드
- [ ] 모든 관리 UI 통합
- [ ] 실시간 업데이트

### Phase 12: WebSocket (2일)
- [ ] Fly.io 사이드카 설정
- [ ] WebSocket 서버
- [ ] 클라이언트 통합

### Phase 13: Polish (3-4일)
- [ ] 종합 테스트
- [ ] 성능 최적화
- [ ] 보안 감사
- [ ] 문서화

---

## 총 예상 기간

| 단계 | 예상 기간 |
|------|----------|
| Phase 0-2 | 5-7일 |
| Phase 3-6 | 10-13일 |
| Phase 7-10 | 11-15일 |
| Phase 11-13 | 9-11일 |
| **총계** | **35-46일** |

---

## 우선순위 지표

```
[P0] 크리티컬 - 다른 작업의 선행 조건
[P1] 높음 - 핵심 기능
[P2] 중간 - 중요하지만 지연 가능
[P3] 낮음 - 향후 추가 가능
```

---

## 진행 상태 표기

```
[ ] 미시작
[~] 진행 중
[x] 완료
[!] 차단됨
[?] 검토 필요
```

---

## 빠른 참조

### 환경 변수 키

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX_NAME=

# OpenAI
OPENAI_API_KEY=

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=

# KakaoTalk
KAKAO_CHANNEL_ID=
KAKAO_API_KEY=

# Inngest
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Fly.io WebSocket
FLY_WEBSOCKET_URL=

# Sentry
SENTRY_DSN=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

### 주요 경로

| 경로 | 설명 |
|------|------|
| `/admin` | 관리자 대시보드 |
| `/admin/employees` | 직원 관리 |
| `/admin/categories` | 카테고리 관리 |
| `/admin/templates` | 템플릿 관리 |
| `/admin/documents` | 문서 관리 |
| `/admin/analytics` | 분석 대시보드 |
| `/api/kakao/webhook` | 카카오톡 웹훅 |
| `/api/inngest` | Inngest 함수 엔드포인트 |

---

## 다음 단계

1. **standards/** 문서 검토
2. **PHASE-00-FOUNDATION.md** 부터 순차 진행
3. 각 Phase 완료 시 **progress/TRACKER.md** 업데이트
