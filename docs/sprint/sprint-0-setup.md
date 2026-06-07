# Sprint 0 — 기술 셋업

> [← 스프린트 계획 인덱스](../SPRINT-PLAN.md) · 다음: [Sprint 1 →](./sprint-1-knowledge-core.md)

| 항목 | 내용 |
| --- | --- |
| Phase | 사전 셋업 |
| 선행 의존성 | 없음 |
| 후행 영향 | 모든 후속 스프린트 |

---

## 목표

모든 개발자가 동일 환경에서 코드를 작성·배포할 수 있는 골격을 만든다.

## 태스크

- [ ] Supabase 프로젝트 생성 (개발/프로덕션 분리), `pgvector` 확장 활성화
- [ ] React 19 + TypeScript + Vite + Tailwind + shadcn/ui 스캐폴딩
- [ ] `@supabase/supabase-js` 연동, 환경변수(`.env`) 규약 정의
- [ ] `supabase/migrations/`에 PRD 8장 스키마 초기 마이그레이션 작성
- [ ] Supabase Auth 연동 + `users` 프로필 테이블 트리거(`auth.users` → `public.users`)
- [ ] RLS 기본 정책 골격 (`viewer/editor/lead`) 및 헬퍼 함수
- [ ] Vercel 배포 파이프라인 + GitHub Actions(린트·타입체크) CI
- [ ] 프로젝트 구조 컨벤션 문서화 (폴더 구조, 네이밍)

## 산출물

배포 가능한 빈 앱 + 마이그레이션 + 로그인 동작

## 완료 기준 (DoD)

- 로컬에서 `supabase start` + `npm run dev`로 앱이 뜨고 로그인이 된다.
- 마이그레이션이 깨끗한 DB에 무오류 적용된다.
- main push 시 Vercel 프리뷰가 자동 생성된다.
