# Sprint 5 — Ask the Hub (대화형 RAG 어시스턴트)

> [← Sprint 4](./sprint-4-classify-assetize.md) · [스프린트 계획 인덱스](../SPRINT-PLAN.md) · 다음: [Sprint 6+ →](./sprint-6-quality-loop.md)

| 항목 | 내용 |
| --- | --- |
| Phase | 2 |
| 포함 FR | FR-7 (전체) |
| 선행 의존성 | Sprint 2 (검색·임베딩), Sprint 4 (자산화 재사용) |

---

## 목표

자연어 질문에 출처 기반 답변 초안을 제공하는 어시스턴트를 완성한다.

## 태스크

- [ ] `chat_sessions` / `chat_messages` / `retrievals` 연동 + 멀티턴 세션 — FR-7.1
- [ ] `chat` Edge Function: 질의 임베딩 → 하이브리드 검색 → grounded 답변 (스트리밍) — FR-7.2
- [ ] 인용 출처 목록 UI (문의/FAQ/카드, 클릭 시 원문 열림) — FR-7.3
- [ ] 클라이언트 override 최우선 적용 + 충돌 경고 — FR-7.4
- [ ] 근거 임계치 미만 시 단정 금지 + 자산화 큐 등록 유도 — FR-7.5
- [ ] "이 초안 복사" / "FAQ로 저장" 자가 적립 (Sprint 4 재사용) — FR-7.6
- [ ] 답변별 피드백(도움됨/근거부족/틀림) 수집 — FR-7.7

## 산출물

Ask the Hub 대화 화면

## 완료 기준 (DoD)

- "A 고객 이중결제" 질문 시 유사 문의+FAQ가 출처로 표시되고 A의 override가 우선 반영된 초안 생성(AC1).
- 근거 없으면 추측 답변 대신 "참고 자료 없음" + 자산화 큐 버튼 제시(AC2).
- 모든 핵심 문장이 클릭 가능한 출처와 연결됨, 출처 없는 주장 0건(AC3).
