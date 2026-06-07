# Sprint 1 — 지식 기반 코어 (FAQ·권한·클라이언트 카드)

> [← Sprint 0](./sprint-0-setup.md) · [스프린트 계획 인덱스](../SPRINT-PLAN.md) · 다음: [Sprint 2 →](./sprint-2-search-migration.md)

| 항목 | 내용 |
| --- | --- |
| Phase | 1 (MVP) |
| 포함 FR | FR-2(FAQ 관리), FR-3(클라이언트 설정 카드), FR-6(권한·감사) |
| 선행 의존성 | Sprint 0 |

---

## 목표

지식을 등록·관리하고 권한으로 보호하는 핵심 CRUD를 완성한다.

## 태스크

- [ ] FAQ CRUD (마크다운 본문, 카테고리·태그) — FR-2.1
- [ ] FAQ 상태 전이 `draft → verified → deprecated` (RPC) — FR-2.2
- [ ] `faq_versions` 변경 이력 트리거 + diff 조회 UI — FR-2.3
- [ ] 클라이언트 CRUD + 설정 카드(`client_configs`) CRUD — FR-3.1
- [ ] override `applies_to` 연결 + severity별 색상 표시 — FR-3.2
- [ ] 답변 화면 override 경고 배너 (critical은 확인 체크) — FR-3.3
- [ ] 역할별 RLS 정책 완성 (viewer/editor/lead) — FR-6.1
- [ ] `audit_logs` 기록 (create/update/delete/status_change) — FR-6.2

## 산출물

FAQ·클라이언트 카드 관리 화면, 권한 적용

## 완료 기준 (DoD)

- editor가 FAQ를 만들고 lead가 verified로 승격할 수 있다.
- FAQ 수정 시 이전 버전이 보존되고 변경자·시각이 기록된다(AC FR-2.3).
- 삼성 선택 후 "비밀번호 재설정"을 열면 override 배너가 뜬다(AC FR-3.3).
- viewer는 수정 버튼이 비활성/차단된다.
