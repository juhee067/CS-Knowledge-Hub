# Sprint 2 — 통합 검색 + 초기 데이터 이관 (MVP 완성)

> [← Sprint 1](./sprint-1-knowledge-core.md) · [스프린트 계획 인덱스](../SPRINT-PLAN.md) · 다음: [Sprint 3 →](./sprint-3-intake-connectors.md)

| 항목 | 내용 |
| --- | --- |
| Phase | 0 + 1 (MVP 완성) |
| 포함 FR | FR-1(통합 검색), FR-8.1(초기 이관) |
| 선행 의존성 | Sprint 1 |

---

## 목표

키워드+의미 하이브리드 검색을 완성하고, 초기 시드 데이터로 즉시 가치를 낸다. (Phase 0 + Phase 1 마무리)

## 태스크

- [x] FAQ 임베딩 생성 Edge Function (`embed-faq`) + 저장/수정 후 자동 호출
- [x] `search_knowledge` RPC: Postgres FTS + pgvector 하이브리드 — FR-1.2
- [x] 단일 검색창 UI (FAQ + 클라이언트 카드 동시) — FR-1.1
- [x] 클라이언트·카테고리·상태 필터 — FR-1.3
- [x] CSV/Excel 업로드 UI + 컬럼 매핑 + 오류 행 처리 — FR-8.1.1
- [x] `intake-bulk` Edge Function (일괄 적재) — FR-8.1.1
- [x] 위키(Notion/Confluence) URL 임포트 → FAQ 초안 — FR-8.1.2
- [x] 수동 복붙 단축 입력 폼 — FR-8.1.3
- [x] 초기 시드: FAQ 50건 + 클라이언트 카드 5곳 + 과거 문의 100건 이관

## 산출물

동작하는 통합 검색 + 시드 데이터가 담긴 MVP

## 완료 기준 (DoD)

- "비밀번호 재설정" 검색 시 관련 FAQ + override 있는 클라이언트 카드가 함께 노출(AC FR-1).
- CSV 100행 업로드 시 오류 행 제외 후 30초 내 적재, 오류 목록 다운로드(AC FR-8.1).
- 의미 검색으로 정확한 키워드 없이도 관련 FAQ가 검색된다.
- **🚀 MVP 출시 가능 지점**
