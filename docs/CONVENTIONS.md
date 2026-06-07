# 프로젝트 구조 & 컨벤션

> Sprint 0 산출물. 모든 기여자가 동일한 구조·네이밍으로 코드를 작성하기 위한 기준.

## 기술 스택

- **프론트엔드**: React 19 · TypeScript · Vite · Tailwind CSS v4 · shadcn/ui
- **백엔드**: Supabase (PostgreSQL · Auth · RLS · pgvector)
- **배포/CI**: Vercel (프리뷰·프로덕션) · GitHub Actions (lint·typecheck·build)

## 폴더 구조

```
.
├─ src/
│  ├─ api/            # Supabase 데이터 접근 계층 (도메인별 모듈)
│  │                  #   faqs.ts, clients.ts, audit.ts …
│  ├─ components/     # 공용 컴포넌트 (도메인 무관 + 도메인 위젯)
│  │  └─ ui/          # shadcn/ui 프리미티브 (button, card, badge …)
│  ├─ contexts/       # React Context (AuthContext 등 전역 상태)
│  ├─ lib/            # 공용 유틸 · 클라이언트
│  │                  #   supabase.ts(클라이언트), utils.ts(cn/formatDate),
│  │                  #   database.types.ts(DB 타입)
│  ├─ pages/          # 라우트 단위 페이지 컴포넌트
│  ├─ types.ts        # 도메인 타입 재노출 (database.types 기반)
│  ├─ App.tsx         # 라우팅 구성
│  └─ main.tsx        # 엔트리포인트
├─ supabase/
│  ├─ migrations/     # DB 마이그레이션 (<timestamp>_name.sql, 순서대로 적용)
│  ├─ seed.sql        # 로컬 시드 데이터 (db reset 시 자동 적용)
│  └─ config.toml     # 로컬 Supabase 설정
├─ docs/              # PRD · 스프린트 계획 · 컨벤션
└─ .github/workflows/ # CI 파이프라인
```

## 네이밍

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 컴포넌트·페이지 파일 | PascalCase `.tsx` | `FaqListPage.tsx`, `StatusBadge.tsx` |
| 컴포넌트·페이지 export | named export(PascalCase) | `export function Layout()` |
| api·lib·util 파일 | camelCase `.ts` | `faqs.ts`, `utils.ts` |
| 함수 | camelCase | `listFaqs`, `setFaqStatus` |
| 타입·인터페이스 | PascalCase | `Faq`, `FaqFilter`, `Role` |
| DB 테이블·컬럼 | snake_case | `client_configs`, `updated_at` |
| 마이그레이션 파일 | `<timestamp>_snake_case.sql` | `20260607000001_init_schema.sql` |
| 라우트 경로 | kebab/소문자 | `/faqs`, `/faqs/:id/edit` |

## import 경로

- `@/` 별칭은 `src/` 를 가리킨다 (vite + tsconfig `paths`).
- 예: `import { supabase } from '@/lib/supabase'`

## 데이터 접근 규칙

- 단순 CRUD 는 `src/api/*` 모듈을 통해 `@supabase/supabase-js` 클라이언트로 직접 호출. 권한은 **RLS** 가 검증한다(클라이언트에서 권한 분기는 UX 보조용).
- 권한 검증·다단계 로직이 필요한 동작은 **Database Function(RPC)** 으로 (`update_faq_status` 등).
- 모든 변경(create/update/delete/status_change)은 `logAudit()` 로 `audit_logs` 에 기록.

## 역할 (RLS)

| 역할 | 권한 |
| --- | --- |
| `viewer` | 읽기 전용 |
| `editor` | 콘텐츠 생성·수정 (faqs, clients, client_configs, inquiries) |
| `lead` | 전체 권한 — 삭제, FAQ `verified` 승격, 사용자 역할 관리, 감사 로그 열람 |

> 회원가입 시 첫 사용자는 `lead`, 이후는 `editor` 로 자동 부여(`handle_new_user` 트리거). 운영 중 조정은 `lead` 가 수행.

## 환경변수

- 클라이언트 노출 값은 `VITE_` 접두사 필수. 서버 전용 비밀(`service_role` 키 등)은 절대 노출 금지.
- `.env.example` 복사 → `.env.local` (커밋 금지). [.env.example](../.env.example) 참고.

## 로컬 개발

```bash
npm install
cp .env.example .env.local        # 값 채우기 (로컬은 supabase status 참고)
supabase start                    # 로컬 DB/Auth 기동
supabase db reset                 # 마이그레이션 + 시드 적용
npm run dev                       # http://localhost:5173
```

## 커밋 · 브랜치

- 작업 단위마다 GitHub 이슈 + 브랜치 생성. `main` 직접 커밋 금지.
- PR 머지 시 `Closes #N` 으로 이슈 자동 종료.
