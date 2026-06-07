# Sprint 3 — 자동 수집 커넥터 (Intake Pipeline)

> [← Sprint 2](./sprint-2-search-migration.md) · [스프린트 계획 인덱스](../SPRINT-PLAN.md) · 다음: [Sprint 4 →](./sprint-4-classify-assetize.md)

| 항목 | 내용 |
| --- | --- |
| Phase | 2 |
| 포함 FR | FR-8.2~8.8 |
| 선행 의존성 | Sprint 2 |

---

## 목표

문의가 어디서 오든 자동으로 `inquiries`에 쌓이게 한다.

## 태스크

- [ ] 공통 정규화 Edge Function `intake-normalize` + `source/source_ref` dedup — FR-8 공통
- [ ] **Google Forms**: Apps Script 가이드 + `intake-google-form` 웹훅 — FR-8.2 *(우선순위 1: 가장 빠름)*
- [ ] **Gmail**: OAuth2 + Pub/Sub Watch + `intake-email` + 7일 갱신 — FR-8.3
- [ ] **Slack**: App 생성 + Events API + `intake-slack` + 스레드 연결 — FR-8.4
- [ ] **카카오 채널**: 비즈 채널 웹훅 `intake-kakao` (채널 개설 전제) — FR-8.5
- [ ] **SMS**: Solapi 수신 웹훅 `intake-sms` (수신번호 개설 전제) — FR-8.6
- [ ] 전화·기타 "빠른 입력" 단축 UI (3필드) — FR-8.7
- [ ] 수집 현황 대시보드 (채널별 인입량·미처리율·오류 알림) — FR-8.8

## 산출물

채널 커넥터 + 수집 대시보드

## 완료 기준 (DoD)

- 테스트 폼 제출 후 10초 내 `inquiries`에 적재, 재제출 시 중복 없음(AC FR-8.2).
- 지정 레이블 메일이 1분 내 적재(AC FR-8.3), Slack 메시지 5초 내 적재(AC FR-8.4).
- 카카오·SMS는 채널/번호 미개설 시 수동 폼이 대체 수단으로 제공된다.

## ⚠️ 외부 의존성

카카오 비즈 채널·SMS 수신번호 개설은 사전 행정 절차가 필요하다. 미완료 시 해당 커넥터는 [Sprint 6](./sprint-6-quality-loop.md)으로 이연하고 수동 폼으로 대체한다.
