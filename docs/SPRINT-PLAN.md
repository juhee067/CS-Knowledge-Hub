# 스프린트 계획 — CS Knowledge Hub

> [PRD-CS-Knowledge-Hub.md](../PRD-CS-Knowledge-Hub.md)를 실제 개발 착수 단위로 분해한 스프린트 계획서입니다.

| 항목      | 내용                          |
| --------- | ----------------------------- |
| 문서 버전 | v1.0                          |
| 작성일    | 2026-06-07                    |
| 기준 PRD  | PRD-CS-Knowledge-Hub.md (v1.0) |
| 스프린트  | 1주 단위 (조정 가능)          |

---

## 1. 전체 로드맵 한눈에 보기

```
Sprint 0   기술 셋업          ── 인프라·스캐폴딩·스키마·인증 골격
Sprint 1   지식 기반 코어     ── FAQ 관리 + 권한 + 클라이언트 카드        ┐
Sprint 2   통합 검색 + 이관   ── 하이브리드 검색 + 초기 데이터 시드        ┘ Phase 0·1 (MVP)
Sprint 3   자동 수집 커넥터   ── Google Forms / Gmail / Slack intake      ┐
Sprint 4   분류 & 자산화      ── 자동 분류 + 추천 + 원클릭 FAQ화 + 큐       │ Phase 2
Sprint 5   Ask the Hub        ── RAG 대화형 어시스턴트 + 피드백            ┘
Sprint 6+  품질 루프 (백로그) ── 노후화 알림 / 랭킹 학습 / 전화 STT / 대시보드  Phase 3
```

**MVP 출시 지점:** Sprint 2 종료 시 (지식 기반 + 검색 + 시드 데이터).

---

## 2. 의존성 그래프

```
Sprint 0 (셋업)
   │
   ├──► Sprint 1 (FAQ·권한·카드)
   │        │
   │        ├──► Sprint 2 (검색·이관) ──► [MVP 출시]
   │        │        │
   │        │        ├──► Sprint 3 (수집 커넥터)
   │        │        │
   │        │        └──► Sprint 4 (분류·자산화)
   │        │                 │
   │        └─────────────────┴──► Sprint 5 (Ask the Hub, 검색·임베딩 인프라 재사용)
   │
   └──► (인증·RLS는 Sprint 1부터 모든 후속에 영향)
```

- **임베딩 인프라**는 Sprint 2(의미 검색)에서 처음 도입 → Sprint 4·5에서 재사용.
- **Ask the Hub(Sprint 5)** 는 Sprint 2 검색 + Sprint 4 자산화를 전제로 한다.

---

## 3. 스프린트 상세

### Sprint 0 — 기술 셋업

**목표:** 모든 개발자가 동일 환경에서 코드를 작성·배포할 수 있는 골격을 만든다.

**태스크**

- [ ] Supabase 프로젝트 생성 (개발/프로덕션 분리), `pgvector` 확장 활성화
- [ ] React 19 + TypeScript + Vite + Tailwind + shadcn/ui 스캐폴딩
- [ ] `@supabase/supabase-js` 연동, 환경변수(`.env`) 규약 정의
- [ ] `supabase/migrations/`에 PRD 8장 스키마 초기 마이그레이션 작성
- [ ] Supabase Auth 연동 + `users` 프로필 테이블 트리거(`auth.users` → `public.users`)
- [ ] RLS 기본 정책 골격 (`viewer/editor/lead`) 및 헬퍼 함수
- [ ] Vercel 배포 파이프라인 + GitHub Actions(린트·타입체크) CI
- [ ] 프로젝트 구조 컨벤션 문서화 (폴더 구조, 네이밍)

**산출물:** 배포 가능한 빈 앱 + 마이그레이션 + 로그인 동작

**완료 기준(DoD)**
- 로컬에서 `supabase start` + `npm run dev`로 앱이 뜨고 로그인이 된다.
- 마이그레이션이 깨끗한 DB에 무오류 적용된다.
- main push 시 Vercel 프리뷰가 자동 생성된다.

---

### Sprint 1 — 지식 기반 코어 (FAQ·권한·클라이언트 카드)

**목표:** 지식을 등록·관리하고 권한으로 보호하는 핵심 CRUD를 완성한다.

**포함 FR:** FR-2(FAQ 관리), FR-3(클라이언트 설정 카드), FR-6(권한·감사)

**태스크**

- [ ] FAQ CRUD (마크다운 본문, 카테고리·태그) — FR-2.1
- [ ] FAQ 상태 전이 `draft → verified → deprecated` (RPC) — FR-2.2
- [ ] `faq_versions` 변경 이력 트리거 + diff 조회 UI — FR-2.3
- [ ] 클라이언트 CRUD + 설정 카드(`client_configs`) CRUD — FR-3.1
- [ ] override `applies_to` 연결 + severity별 색상 표시 — FR-3.2
- [ ] 답변 화면 override 경고 배너 (critical은 확인 체크) — FR-3.3
- [ ] 역할별 RLS 정책 완성 (viewer/editor/lead) — FR-6.1
- [ ] `audit_logs` 기록 (create/update/delete/status_change) — FR-6.2

**산출물:** FAQ·클라이언트 카드 관리 화면, 권한 적용

**완료 기준(DoD)**
- editor가 FAQ를 만들고 lead가 verified로 승격할 수 있다.
- FAQ 수정 시 이전 버전이 보존되고 변경자·시각이 기록된다(AC FR-2.3).
- 삼성 선택 후 "비밀번호 재설정"을 열면 override 배너가 뜬다(AC FR-3.3).
- viewer는 수정 버튼이 비활성/차단된다.

---

### Sprint 2 — 통합 검색 + 초기 데이터 이관 (MVP 완성)

**목표:** 키워드+의미 하이브리드 검색을 완성하고, 초기 시드 데이터로 즉시 가치를 낸다. (Phase 0 + Phase 1 마무리)

**포함 FR:** FR-1(통합 검색), FR-8.1(초기 이관)

**태스크**

- [ ] FAQ 임베딩 생성 Edge Function (`embed-faq`) + 저장/수정 후 자동 호출
- [ ] `search_knowledge` RPC: Postgres FTS + pgvector 하이브리드 — FR-1.2
- [ ] 단일 검색창 UI (FAQ + 클라이언트 카드 동시) — FR-1.1
- [ ] 클라이언트·카테고리·상태 필터 — FR-1.3
- [ ] CSV/Excel 업로드 UI + 컬럼 매핑 + 오류 행 처리 — FR-8.1.1
- [ ] `intake-bulk` Edge Function (일괄 적재) — FR-8.1.1
- [ ] 위키(Notion/Confluence) URL 임포트 → FAQ 초안 — FR-8.1.2
- [ ] 수동 복붙 단축 입력 폼 — FR-8.1.3
- [ ] 초기 시드: FAQ 50건 + 클라이언트 카드 5곳 + 과거 문의 100건 이관

**산출물:** 동작하는 통합 검색 + 시드 데이터가 담긴 MVP

**완료 기준(DoD)**
- "비밀번호 재설정" 검색 시 관련 FAQ + override 있는 클라이언트 카드가 함께 노출(AC FR-1).
- CSV 100행 업로드 시 오류 행 제외 후 30초 내 적재, 오류 목록 다운로드(AC FR-8.1).
- 의미 검색으로 정확한 키워드 없이도 관련 FAQ가 검색된다.
- **🚀 MVP 출시 가능 지점**

---

### Sprint 3 — 자동 수집 커넥터 (Intake Pipeline)

**목표:** 문의가 어디서 오든 자동으로 `inquiries`에 쌓이게 한다.

**포함 FR:** FR-8.2~8.8

**태스크**

- [ ] 공통 정규화 Edge Function `intake-normalize` + `source/source_ref` dedup — FR-8 공통
- [ ] **Google Forms**: Apps Script 가이드 + `intake-google-form` 웹훅 — FR-8.2 *(우선순위 1: 가장 빠름)*
- [ ] **Gmail**: OAuth2 + Pub/Sub Watch + `intake-email` + 7일 갱신 — FR-8.3
- [ ] **Slack**: App 생성 + Events API + `intake-slack` + 스레드 연결 — FR-8.4
- [ ] **카카오 채널**: 비즈 채널 웹훅 `intake-kakao` (채널 개설 전제) — FR-8.5
- [ ] **SMS**: Solapi 수신 웹훅 `intake-sms` (수신번호 개설 전제) — FR-8.6
- [ ] 전화·기타 "빠른 입력" 단축 UI (3필드) — FR-8.7
- [ ] 수집 현황 대시보드 (채널별 인입량·미처리율·오류 알림) — FR-8.8

**산출물:** 채널 커넥터 + 수집 대시보드

**완료 기준(DoD)**
- 테스트 폼 제출 후 10초 내 `inquiries`에 적재, 재제출 시 중복 없음(AC FR-8.2).
- 지정 레이블 메일이 1분 내 적재(AC FR-8.3), Slack 메시지 5초 내 적재(AC FR-8.4).
- 카카오·SMS는 채널/번호 미개설 시 수동 폼이 대체 수단으로 제공된다.

> ⚠️ **외부 의존성**: 카카오 비즈 채널·SMS 수신번호 개설은 사전 행정 절차 필요 → 미완료 시 해당 커넥터는 Sprint 6으로 이연하고 수동 폼으로 대체.

---

### Sprint 4 — 자동 분류 & 지식 자산화

**목표:** 문의를 자동 분류·추천하고, 답변을 원클릭으로 지식화한다.

**포함 FR:** FR-4(자동 분류·추천), FR-5(지식 자산화)

**태스크**

- [ ] `classify-inquiry` Edge Function: 카테고리·클라이언트 추정 + 신뢰도 — FR-4.1
- [ ] 유사 FAQ/카드 Top-N 추천 (임베딩 유사도) — FR-4.2
- [ ] 분류·추천 결과 담당자 수정/확정 UI + 피드백 적립 — FR-4.3
- [ ] 문의 처리 화면 (좌: 원문 / 중: 분류·유사 / 우: 답변 작성 + override)
- [ ] `assetize` Edge Function: "FAQ로 저장" → 신규 FAQ 초안 — FR-5.1
- [ ] 유사도 높을 시 병합/업데이트 제안 (중복 방지) — FR-5.2
- [ ] 자산화 큐 대시보드 (빈출 미해결 문의 랭킹) — FR-5.3
- [ ] 반복 문의 N회 자동 큐 등록 (임계치 설정)

**산출물:** 문의 → 분류 → 답변 → 자산화 한 화면 완결

**완료 기준(DoD)**
- 신규 문의 붙여넣기 시 1초 내 추정 카테고리 + 유사 FAQ 5건 표시(AC FR-4).
- 동일 취지 FAQ 존재 시 "기존 FAQ 업데이트" 제안이 우선 노출(AC FR-5).
- 한 화면에서 문의→자산화가 완결된다(PRD 14장 Phase 2 DoD).

---

### Sprint 5 — Ask the Hub (대화형 RAG 어시스턴트)

**목표:** 자연어 질문에 출처 기반 답변 초안을 제공하는 어시스턴트를 완성한다.

**포함 FR:** FR-7 (전체)

**태스크**

- [ ] `chat_sessions` / `chat_messages` / `retrievals` 연동 + 멀티턴 세션 — FR-7.1
- [ ] `chat` Edge Function: 질의 임베딩 → 하이브리드 검색 → grounded 답변 (스트리밍) — FR-7.2
- [ ] 인용 출처 목록 UI (문의/FAQ/카드, 클릭 시 원문 열림) — FR-7.3
- [ ] 클라이언트 override 최우선 적용 + 충돌 경고 — FR-7.4
- [ ] 근거 임계치 미만 시 단정 금지 + 자산화 큐 등록 유도 — FR-7.5
- [ ] "이 초안 복사" / "FAQ로 저장" 자가 적립 (Sprint 4 재사용) — FR-7.6
- [ ] 답변별 피드백(도움됨/근거부족/틀림) 수집 — FR-7.7

**산출물:** Ask the Hub 대화 화면

**완료 기준(DoD)**
- "A 고객 이중결제" 질문 시 유사 문의+FAQ가 출처로 표시되고 A의 override가 우선 반영된 초안 생성(AC1).
- 근거 없으면 추측 답변 대신 "참고 자료 없음" + 자산화 큐 버튼 제시(AC2).
- 모든 핵심 문장이 클릭 가능한 출처와 연결됨, 출처 없는 주장 0건(AC3).

---

### Sprint 6+ — 품질 루프 (백로그, Phase 3)

**목표:** 지표 기반 개선 루프를 자동화한다.

**태스크 후보**

- [ ] `verified` 만료 알림 + deprecated 워크플로 (지식 노후화)
- [ ] 분류·답변 피드백을 검색·랭킹 개선에 반영 (학습 루프)
- [ ] PRD 7장 지표 자동 집계 대시보드 (북극성·입력 지표)
- [ ] 어시스턴트 답변 정확도 모니터링
- [ ] 전화 채널 STT 자동화 (클라우드 콜센터 + CLOVA Speech)
- [ ] Sprint 3에서 이연된 카카오/SMS 커넥터 (채널 개설 완료 시)

---

## 4. 스프린트 운영 규칙

### 작업 프로세스 (Git)

각 태스크(또는 태스크 묶음)는 다음 흐름을 따른다:

1. **이슈 생성** — 태스크 단위로 GitHub 이슈 생성
2. **브랜치 분기** — `feat/`, `fix/`, `docs/`, `chore/` 접두사 + 설명 (예: `feat/faq-crud`)
3. **작업 & PR** — 브랜치에서 작업 후 PR 생성, 본문에 `Closes #N`
4. **머지 & 종료** — main 머지 시 이슈 자동 종료

### 공통 정의

- **Definition of Ready:** 이슈에 목표·포함 FR·완료 기준이 적혀 있다.
- **Definition of Done:** 위 각 스프린트의 DoD 충족 + CI 통과 + PR 리뷰 머지.

---

## 5. 리스크 & 대응 (스프린트 관점)

| 리스크 | 영향 스프린트 | 대응 |
|--------|---------------|------|
| 임베딩/LLM API 비용·지연 | S2, S4, S5 | 서비스 레이어 추상화 + 모킹, 캐싱, 배치 임베딩 |
| 카카오/SMS 채널 개설 행정 지연 | S3 | 수동 폼으로 대체, 커넥터는 S6 이연 |
| 초기 시드 데이터 품질 | S2 | 이관 시 담당자 검토 후 verified 전환 |
| RLS 정책 누락으로 권한 사고 | S1~ | S1에서 정책 골격 확정 + 테스트 케이스화 |
| 어시스턴트 환각 | S5 | 출처 강제·근거 부족 시 보류(FR-7.5) |
