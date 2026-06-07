# 스프린트 계획 — CS Knowledge Hub

> [PRD-CS-Knowledge-Hub.md](../PRD-CS-Knowledge-Hub.md)를 실제 개발 착수 단위로 분해한 스프린트 계획서입니다.
> 이 문서는 **인덱스**이며, 각 스프린트 상세는 [`docs/sprint/`](./sprint/) 하위 문서를 참고하세요.

| 항목      | 내용                          |
| --------- | ----------------------------- |
| 문서 버전 | v1.1                          |
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

## 2. 스프린트 문서 목록

| 스프린트 | 문서 | 포함 FR | Phase |
| --- | --- | --- | --- |
| Sprint 0 | [기술 셋업](./sprint/sprint-0-setup.md) | — | 셋업 |
| Sprint 1 | [지식 기반 코어](./sprint/sprint-1-knowledge-core.md) | FR-2, FR-3, FR-6 | 1 |
| Sprint 2 | [통합 검색 + 이관](./sprint/sprint-2-search-migration.md) | FR-1, FR-8.1 | 0·1 |
| Sprint 3 | [자동 수집 커넥터](./sprint/sprint-3-intake-connectors.md) | FR-8.2~8.8 | 2 |
| Sprint 4 | [분류 & 자산화](./sprint/sprint-4-classify-assetize.md) | FR-4, FR-5 | 2 |
| Sprint 5 | [Ask the Hub](./sprint/sprint-5-ask-the-hub.md) | FR-7 | 2 |
| Sprint 6+ | [품질 루프](./sprint/sprint-6-quality-loop.md) | — | 3 |

---

## 3. 의존성 그래프

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

## 4. 스프린트 운영 규칙

### 작업 프로세스 (Git)

각 태스크(또는 태스크 묶음)는 다음 흐름을 따른다:

1. **이슈 생성** — 태스크 단위로 GitHub 이슈 생성
2. **브랜치 분기** — `feat/`, `fix/`, `docs/`, `chore/` 접두사 + 설명 (예: `feat/faq-crud`)
3. **작업 & PR** — 브랜치에서 작업 후 PR 생성, 본문에 `Closes #N`
4. **머지 & 종료** — main 머지 시 이슈 자동 종료

### 공통 정의

- **Definition of Ready:** 이슈에 목표·포함 FR·완료 기준이 적혀 있다.
- **Definition of Done:** 각 스프린트 문서의 DoD 충족 + CI 통과 + PR 리뷰 머지.

---

## 5. 리스크 & 대응 (스프린트 관점)

| 리스크 | 영향 스프린트 | 대응 |
|--------|---------------|------|
| 임베딩/LLM API 비용·지연 | S2, S4, S5 | 서비스 레이어 추상화 + 모킹, 캐싱, 배치 임베딩 |
| 카카오/SMS 채널 개설 행정 지연 | S3 | 수동 폼으로 대체, 커넥터는 S6 이연 |
| 초기 시드 데이터 품질 | S2 | 이관 시 담당자 검토 후 verified 전환 |
| RLS 정책 누락으로 권한 사고 | S1~ | S1에서 정책 골격 확정 + 테스트 케이스화 |
| 어시스턴트 환각 | S5 | 출처 강제·근거 부족 시 보류(FR-7.5) |
