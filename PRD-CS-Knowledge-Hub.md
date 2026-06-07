# PRD — CS Knowledge Hub

> 고객 문의 대응 품질 편차를 없애기 위한 **CS 지식 자산화 플랫폼 PRD**입니다.

| 항목      | 내용                                     |
| --------- | ---------------------------------------- |
| 문서 버전 | v1.0                                     |
| 작성일    | 2026-06-07                               |
| 작성자    | 최주희                                   |
| 상태      | Draft (구현 착수용)                      |
| 대상 독자 | AI 코딩 에이전트, 풀스택 개발자, CS 리드 |

---

## 1. Summary

CS 팀이 고객 문의에 답할 때 **"누가 답하느냐에 따라 답이 달라지는"** 품질 편차 문제를 해결한다. 핵심은 답할 지식이 없는 게 아니라 **흩어진 지식에 접근할 경로가 없다는 것**이다. 본 서비스는 (1) 공통 FAQ DB, (2) 클라이언트별 설정 카드, (3) 신규 문의를 자동 분류해 지식으로 자산화하는 파이프라인, 그리고 (4) **담당자가 자연어로 물으면 과거 유사 문의·답변과 참고 문서를 근거와 함께 제시하는 대화형 답변 어시스턴트("Ask the Hub")**를 하나의 웹 애플리케이션으로 제공한다.

> **대표 시나리오:** 담당자가 "A 고객이 이런 질문을 했는데 어떻게 답해야 할지 모르겠어요"라고 입력하면, Hub는 _"과거 B 문의에서는 이렇게 답했습니다"_ 와 같이 **근거가 된 과거 답변·FAQ·클라이언트 설정 카드를 출처와 함께 제시**하고, 그 위에서 답변 초안을 만들어 준다.

---

## 2. 문제 정의 (Problem)

### 2.1 고객 관점

- 같은 질문을 해도 담당자에 따라 답변 내용·정확도·톤이 다르다.
- 잘못된 답변(특히 클라이언트별 설정과 다른 답변)으로 재문의·신뢰 저하가 발생한다.

### 2.2 내부(CS 팀) 관점

- 클라이언트마다 설정이 다르다(예: 삼성, 부산대). 그 컨텍스트가 Slack, 메일, 개인 메모, 위키 등 **여러 곳에 흩어져** 있다.
- 신규 담당자 온보딩 시 "어디에 무엇이 있는지" 몰라 오답이 잦다.
- 베테랑의 암묵지가 문서화되지 않아 이탈 시 함께 사라진다.

### 2.3 핵심 증상

> "문의가 들어오면 → 누구에게 물어야 할지부터 찾는다 → 답을 찾아도 클라이언트 설정이 반영됐는지 확신이 없다."

---

## 3. 가설 (Hypothesis)

> **"문의 대응 품질이 낮은 이유는 지식 자체가 없어서가 아니라, 접근 경로가 없어서다."**

### 검증 가능한 형태

- H1. 답변에 필요한 지식의 70% 이상은 이미 조직 내에 존재한다(누군가의 머리/메모/채팅 안에).
- H2. 검색·접근 경로를 단일화하면 **신규 담당자의 첫 정답률**과 **평균 응답 시간**이 유의미하게 개선된다.
- H3. 문의를 처리하는 흐름 자체에서 지식을 자산화하면(답변 → FAQ화) 지식 베이스가 자생적으로 성장한다.

### 검증 지표 (북극성 및 입력 지표)

| 지표                        | 정의                                                    | 목표(MVP 후 8주)      |
| --------------------------- | ------------------------------------------------------- | --------------------- |
| **북극성: 답변 자가완결률** | 다른 사람에게 묻지 않고 Hub만으로 답을 완성한 문의 비율 | 40% → 70%             |
| 신규 담당자 첫 정답률       | 온보딩 4주차 담당자의 답변 정확도(QA 샘플링)            | +20%p                 |
| 평균 1차 응답 시간          | 문의 접수 → 1차 답변                                    | -30%                  |
| 지식 자산화율               | 신규 문의 중 FAQ/카드로 자산화된 비율                   | 주당 신규 문의의 15%+ |
| FAQ 재사용률                | 답변 작성 시 기존 FAQ/카드 참조 비율                    | 60%+                  |
| 어시스턴트 도움됨 비율      | Ask the Hub 답변 중 "도움됨" 피드백 비율                | 70%+                  |

---

## 4. 목표와 비목표 (Goals / Non-Goals)

**Goals (MVP)**

1. 모든 CS 지식을 **한 곳에서 검색**할 수 있게 한다(FAQ + 클라이언트 카드 통합 검색).
2. 클라이언트별 설정 차이를 **구조화된 카드**로 명시한다.
3. 신규 문의를 **자동 분류**하고, 답변을 **원클릭으로 지식 자산화**한다.

**Non-Goals (이번 범위 밖)**

- 고객이 직접 접근하는 외부 셀프서비스 헬프센터(내부 도구 우선).
- 실시간 챗봇 자동응답(자동 초안 제안까지만, 자동 전송 X).
- 멀티 언어 번역, 음성 문의 처리.

---

## 5. 사용자 & 페르소나

| 페르소나                  | 상황(JTBD)                   | 핵심 니즈                                                          |
| ------------------------- | ---------------------------- | ------------------------------------------------------------------ |
| **신규 CS 담당자 (지우)** | 입사 3주차, 삼성 문의를 받음 | "이 클라이언트 설정이 뭔지, 표준 답변이 뭔지 빠르게 확신하고 싶다" |
| **베테랑 CS (현우)**      | 같은 질문에 반복 답변        | "내 답변을 한 번에 자산화해서 다시 안 물어보게 하고 싶다"          |
| **CS 리드 (주희)**        | 품질·온보딩 책임             | "누락된 지식·자주 묻는 미해결 문의를 보고 우선순위를 정하고 싶다"  |

---

## 6. 솔루션 개요

5개의 핵심 모듈로 구성된 단일 웹앱.

```
 ┌──────────────────────────────────────────────────────────────┐
 │  ⑤ 데이터 수집 파이프라인 (Intake Pipeline)                    │
 │                                                              │
 │  [초기 이관]          [자동 수집]            [반자동]          │
 │  CSV/Excel 업로드     Google Forms ──┐      전화 통화 ─┐      │
 │  위키(Notion 등) 임포트 Gmail ────────┤ intake-      수동 메모  │
 │  수동 복붙 입력        Slack ─────────┤ normalize    복붙 UI   │
 │                       카카오 채널 ───┤ Edge Fn      └──┐      │
 │                       SMS (Solapi) ─┘                  │     │
 └───────────────────────────┬──────────────────────────┬─┘     │
                              │  inquiries 테이블 적재    │        
                              ▼                                  
┌─────────────────────────────────────────────────────────┐
│                    CS Knowledge Hub                       │
│                                                           │
│  ① 공통 FAQ DB        ② 클라이언트 설정 카드               │
│  ┌──────────────┐    ┌──────────────────┐                │
│  │ 질문/답변     │    │ 삼성: SSO, 도메인  │                │
│  │ 태그/카테고리 │    │ 부산대: 권한정책   │                │
│  │ 버전/작성자   │    │ override 규칙     │                │
│  └──────┬───────┘    └────────┬─────────┘                │
│         │   통합 검색 (키워드+의미)  │                       │
│         └───────────┬───────────────┘                     │
│                     ▼                                     │
│  ③ 문의 → 자동 분류 → 지식 자산화 파이프라인                  │
│  [inquiries] → [분류/유사문서 추천] → [답변 작성]            │
│             → [원클릭 FAQ화]  ← [④ Ask the Hub 답변]       │
└─────────────────────────────────────────────────────────┘
```

### 6.1 모듈 ① 공통 FAQ DB

- 카테고리·태그 기반으로 정리된 질문/답변 저장소.
- 버전 관리(누가·언제·무엇을 바꿨는지), 신뢰도 상태(`draft` / `verified` / `deprecated`).
- 통합 검색에서 키워드 + 의미(semantic) 검색 지원.

### 6.2 모듈 ② 클라이언트별 설정 카드

- 클라이언트(삼성, 부산대 등)마다 **구조화된 설정 카드** 한 장.
- 표준 FAQ와 다른 **예외/override 규칙**을 명시(예: "삼성은 SSO 로그인만 허용 → 비밀번호 재설정 안내 금지").
- 답변 작성 시 선택한 클라이언트의 override가 자동으로 함께 표시된다.

### 6.3 모듈 ③ 자동 분류 & 자산화 파이프라인

- 신규 문의 텍스트 입력 → 카테고리/클라이언트 **자동 분류** + **유사 FAQ·카드 추천**.
- 담당자가 답변 작성 → **"FAQ로 저장"** 원클릭 → 신규/기존 FAQ로 자산화(중복은 병합 제안).
- 자산화 큐: 자주 묻지만 FAQ가 없는 문의를 리드에게 노출(지식 공백 탐지).

### 6.5 모듈 ⑤ 데이터 수집 파이프라인 (Intake Pipeline)

모든 문의 원천을 `inquiries` 테이블로 수렴시키는 계층. 3가지 수집 유형으로 구성된다.

#### Tier 1 — 초기 이관 (One-time Migration)

| 방식 | 내용 |
|------|------|
| CSV / Excel 업로드 | 관리 UI에서 파일 업로드 → 파싱 후 `inquiries` 또는 `faqs` 행으로 일괄 삽입 |
| 위키 임포트 | Notion / Confluence URL 입력 → 페이지 스크래핑 → FAQ 초안 생성(담당자 검토 후 확정) |
| 수동 복붙 | 개인 메모·슬랙 링크 등 단일 텍스트 입력 폼 (출처 메모 포함) |

#### Tier 2 — 자동 수집 (채널별 API / 웹훅)

| 채널 | 연동 방식 | 구현 세부 |
|------|-----------|-----------|
| **Google Forms** | Apps Script `onFormSubmit` → Edge Function 웹훅 | 폼별 Apps Script 1회 설치, 응답 제출 즉시 적재 |
| **이메일 (Gmail)** | Gmail API Pub/Sub (Watch) + OAuth2 → Edge Function | 지정 레이블 또는 발신 도메인 필터링, 신규 메일 Push 수신 |
| **Slack** | Slack Events API (`message.channels`) → Edge Function | CS 전용 채널 봇 초대, 스레드 포함 수집 |
| **카카오톡 채널** | 카카오 비즈 채널 웹훅 → Edge Function | 카카오 비즈니스 채널(구 플러스친구) 개설 필수; 일반 개인 카톡은 API 미지원 |
| **SMS** | Solapi / NHN Cloud 수신 웹훅 → Edge Function | 전용 수신 번호(080 등) 개설 후 수신 훅 등록 |

> 공통 처리: 모든 웹훅은 `supabase/functions/v1/intake-normalize` Edge Function을 통해 정규화 후 `inquiries`에 적재. `source + source_ref`(외부 메시지 ID) 복합 유니크 키로 중복 방지.

#### Tier 3 — 반자동 수집 (즉시 자동화 불가 채널)

| 채널 | 현재 대응 | 미래 로드맵 |
|------|-----------|-------------|
| **전화** | 통화 종료 후 담당자가 요약 메모 + 클라이언트 선택해 단축 입력 UI에 직접 입력 | 클라우드 콜센터(NHN Cloud Talk / Genesys) + STT(CLOVA Speech) 자동 요약 연동 |
| **카카오톡 개인 DM** | 문의 내용 복붙 → 단축 입력 UI | 카카오 상담톡(비즈 채널) 전환 시 Tier 2로 자동화 |
| **문자 (수신번호 미개설)** | 담당자가 내용 복붙 입력 | Solapi 수신 번호 개설 시 Tier 2로 전환 가능 |

#### 자가 적립 (Tier 4 — 답변 흐름 내 생성)

별도 채널이 아니라 Hub 내 작업 결과가 자동으로 지식으로 쌓이는 구조:

1. **문의 처리 화면**: 담당자가 답변 작성 → "FAQ로 저장" 클릭 → `faqs` 테이블에 즉시 적립.
2. **Ask the Hub**: 대화형 어시스턴트가 생성한 답변 초안 → "FAQ로 저장" 클릭 → 모듈 ③ 자산화 파이프라인 합류.
3. **자동 승격**: 동일 문의가 N회 이상 반복될 경우(임계치 설정) 자산화 큐에 자동 등록 → 리드 검토 후 `verified` FAQ로 전환.

---

### 6.4 모듈 ④ 대화형 답변 어시스턴트 ("Ask the Hub")

조직의 지식(FAQ + 클라이언트 카드 + 과거 문의·답변)을 근거로, 자연어 질문에 **출처 기반(grounded) 답변**을 제시하는 RAG 챗 인터페이스.

**대화 흐름**

```
담당자: "A 고객이 결제가 이중으로 빠졌다는데 어떻게 답하죠?"
          │
          ▼ (1) 질의 임베딩 → 유사 검색 (과거 문의/답변 + FAQ + 클라이언트 카드)
          ▼ (2) 클라이언트(A) 설정 카드의 override 우선 적용
          ▼ (3) LLM이 검색된 근거만 사용해 답변 초안 생성
          │
Hub:  "과거 유사 문의(#1043, B 고객)에서는 이렇게 답했습니다:
        〈환불 정책 안내 + 영업일 3일 내 재정산〉
        ── 근거 ──
        • [문의 #1043] B 고객 이중결제 답변 (2026-03, 현우)   [열기]
        • [FAQ] 결제 오류 시 대응 절차 (verified)            [열기]
        • [클라이언트 카드] A: 환불은 본사 승인 필수 ⚠ override [열기]

        ✅ 추천 답변 초안:  ...
        [이 초안 복사]  [FAQ로 저장]  [근거가 부족해요]"
```

**핵심 원칙**

- **출처 없는 답변 금지(no hallucination):** 검색된 근거(FAQ/카드/과거 답변)에만 기반하며, 각 문장에 출처를 연결한다. 근거가 부족하면 단정하지 않고 "관련 자료가 부족합니다 → 자산화 큐에 등록" 으로 유도한다.
- **클라이언트 컨텍스트 우선:** 질문에서 클라이언트가 식별되면 해당 설정 카드의 `override`를 최우선 근거로 삼고, 충돌 시 경고한다.
- **자산화 연결:** 대화로 만든 답변도 한 번에 FAQ로 저장 가능 → 모듈 ③ 파이프라인과 합류.

---

## 7. 기능 요구사항 (Functional Requirements)

각 요구사항은 구현/테스트 단위로 분해된 수용 기준을 포함한다.

### FR-1. 통합 검색

- FR-1.1 단일 검색창에서 FAQ와 클라이언트 카드를 동시 검색한다.
- FR-1.2 키워드 검색(전문 검색) + 의미 검색(임베딩 유사도)을 결합한다.
- FR-1.3 클라이언트 필터·카테고리 필터·상태 필터를 제공한다.
- **AC:** "비밀번호 재설정" 검색 시 관련 FAQ와, 해당 키워드에 override가 있는 클라이언트 카드가 함께 노출된다.

### FR-2. FAQ 관리

- FR-2.1 FAQ 생성/수정/삭제(soft delete), 마크다운 본문 지원.
- FR-2.2 상태 전이: `draft → verified → deprecated`. `verified`만 검색 상위 노출.
- FR-2.3 변경 이력(버전, 작성자, 변경 시각) 기록 및 diff 조회.
- **AC:** FAQ를 수정하면 이전 버전이 보존되고, 변경자/시각이 기록된다.

### FR-3. 클라이언트 설정 카드

- FR-3.1 클라이언트 CRUD + 카드 필드(설정 항목, override 규칙, 담당자, 비고).
- FR-3.2 override 규칙은 특정 FAQ/카테고리에 연결 가능(`applies_to`).
- FR-3.3 답변 작성 화면에서 선택한 클라이언트의 override가 경고 배너로 강조된다.
- **AC:** 삼성 선택 후 "비밀번호 재설정" 문의를 열면 "삼성은 SSO만 허용" override가 빨간 배너로 표시된다.

### FR-4. 자동 분류 & 추천

- FR-4.1 문의 텍스트 입력 시 카테고리·클라이언트를 자동 추정(신뢰도 점수 포함).
- FR-4.2 유사 FAQ/카드 Top-N(기본 5개)을 유사도 순으로 추천.
- FR-4.3 분류·추천 결과는 담당자가 수정/확정 가능(피드백이 학습 데이터로 적립).
- **AC:** 신규 문의를 붙여넣으면 1초 내 추정 카테고리와 유사 FAQ 5건이 표시된다.

### FR-5. 지식 자산화

- FR-5.1 작성한 답변을 "FAQ로 저장" 버튼으로 신규 FAQ 초안 생성.
- FR-5.2 기존 FAQ와 유사도가 높으면 **병합/업데이트 제안**(중복 방지).
- FR-5.3 자산화되지 않은 빈출 문의를 모은 **자산화 큐** 대시보드.
- **AC:** 동일 취지 FAQ가 이미 있으면 신규 생성 대신 "기존 FAQ 업데이트" 제안이 우선 노출된다.

### FR-6. 권한 & 감사

- FR-6.1 역할: `viewer`(검색·조회), `editor`(작성·수정), `lead`(검증·삭제·관리).
- FR-6.2 모든 변경은 감사 로그에 남는다.

### FR-7. 대화형 답변 어시스턴트 ("Ask the Hub")

- FR-7.1 담당자는 자연어로 질문하고 멀티턴 대화를 이어갈 수 있다(세션 유지).
- FR-7.2 질문을 임베딩해 **과거 문의·답변, FAQ, 클라이언트 카드**를 통합 검색(RAG)하고, 검색된 근거만으로 답변 초안을 생성한다.
- FR-7.3 답변에는 **인용된 출처 목록**(과거 문의 #번호·작성자·일자, FAQ 제목·상태, 클라이언트 카드)을 항상 함께 표시하고, 각 출처는 원문으로 바로 열 수 있다.
- FR-7.4 질문에서 클라이언트가 식별/선택되면 해당 카드의 `override`를 최우선 근거로 적용하고, 표준 FAQ와 충돌하면 경고한다.
- FR-7.5 근거 신뢰도가 임계치 미만이면 단정적 답변을 만들지 않고 "관련 자료 부족"을 알리며 **자산화 큐 등록**을 제안한다(FR-5.3 연결).
- FR-7.6 대화 결과 답변을 **"이 초안 복사"** / **"FAQ로 저장"** 으로 즉시 활용·자산화한다.
- FR-7.7 답변별 **피드백(도움됨/근거 부족/틀림)** 을 수집해 검색·랭킹 개선에 사용한다.
- **AC1:** "A 고객 이중결제 문의 어떻게 답하죠?" 입력 시, 유사 과거 문의 1건 이상과 관련 FAQ가 출처로 표시되고, A의 환불 override가 우선 반영된 초안이 생성된다.
- **AC2:** 관련 근거가 없으면 임의 추측 답변을 만들지 않고 "참고할 자료가 없습니다"와 자산화 큐 등록 버튼을 제시한다.
- **AC3:** 답변의 모든 핵심 문장은 클릭 가능한 출처와 연결된다(출처 없는 주장 0건).

### FR-8. 데이터 수집 파이프라인 (Intake Pipeline)

#### FR-8.1 초기 이관

- FR-8.1.1 CSV/Excel 파일 업로드 UI: 컬럼 매핑 화면 제공, 오류 행 별도 표시 후 부분 삽입 허용.
- FR-8.1.2 Notion / Confluence URL 입력 → 페이지 텍스트 스크래핑 → FAQ 초안 일괄 생성(상태 `draft`, 담당자 검토 후 `verified` 전환).
- FR-8.1.3 수동 복붙 단축 입력 폼: 채널·클라이언트·원문·날짜 최소 필드만 요구.
- **AC:** CSV 100행 업로드 시 오류 행을 제외한 나머지가 30초 이내 `inquiries`에 적재되고, 오류 목록이 다운로드 가능하다.

#### FR-8.2 Google Forms 자동 수집

- FR-8.2.1 앱 설정 화면에서 Forms 웹훅 엔드포인트 URL을 생성하고, Apps Script 설치 가이드를 제공한다.
- FR-8.2.2 폼 응답 제출 시 Edge Function이 수신 → 정규화 → `inquiries` 적재(source=`google_form`).
- FR-8.2.3 동일 응답 ID(`source_ref`) 재수신 시 중복 삽입 없이 무시한다.
- **AC:** 테스트 폼 응답 제출 후 10초 이내 `inquiries`에 행이 생성되고, 재제출 시 행이 중복 생성되지 않는다.

#### FR-8.3 Gmail 자동 수집

- FR-8.3.1 OAuth2로 Gmail 계정 연동, Pub/Sub Watch 등록(지정 레이블 또는 발신 도메인 필터).
- FR-8.3.2 신규 메일 수신 시 Push 알림 → Edge Function → `inquiries` 적재(source=`email`, subject·body 포함).
- FR-8.3.3 7일 주기로 Watch 갱신 자동 처리.
- **AC:** 지정 레이블로 전달된 메일이 1분 이내 `inquiries`에 적재된다.

#### FR-8.4 Slack 자동 수집

- FR-8.4.1 Slack App(봇) 생성, 지정 채널 메시지 이벤트 구독 → Edge Function → `inquiries` 적재(source=`slack`).
- FR-8.4.2 스레드 답글은 최초 메시지에 연결(`parent_message_id`)해 맥락 보존.
- FR-8.4.3 봇 자신이 보낸 메시지는 수집 제외.
- **AC:** CS 지정 채널에 메시지 게시 후 5초 이내 `inquiries`에 행이 생성된다.

#### FR-8.5 카카오톡 채널 자동 수집

- FR-8.5.1 카카오 비즈 채널 웹훅 URL 등록 → Edge Function → `inquiries` 적재(source=`kakao`).
- FR-8.5.2 채널 미개설 팀을 위한 수동 복붙 폼을 대체 수단으로 제공한다.

#### FR-8.6 SMS 자동 수집

- FR-8.6.1 Solapi 또는 NHN Cloud 수신 웹훅 등록 → Edge Function → `inquiries` 적재(source=`sms`).
- FR-8.6.2 수신 번호 미개설 팀을 위한 수동 입력 폼을 대체 수단으로 제공한다.

#### FR-8.7 전화·기타 채널 수동 입력

- FR-8.7.1 "새 문의 빠른 입력" 단축 UI(3필드 이하): 채널 선택(전화/카카오DM/기타), 클라이언트, 원문 요약.
- FR-8.7.2 입력 후 자동으로 모듈 ③ 자동 분류 파이프라인으로 진입.

#### FR-8.8 수집 현황 대시보드 (lead)

- FR-8.8.1 채널별 일간/주간 수집 건수, 미처리(open) 비율 표시.
- FR-8.8.2 웹훅 오류·연결 끊김 알림(Supabase 이메일 또는 Slack 봇 알림).

---

## 8. 데이터 모델 (구현용)

Supabase(PostgreSQL) 기준. `pgvector` 확장은 Supabase 대시보드 → Extensions에서 활성화. 사용자 인증은 Supabase Auth(`auth.users`)를 사용하고, 아래 `users` 테이블은 프로필·역할 보관용 공개 테이블로 `auth.users.id`를 참조. 각 테이블에 RLS 정책을 적용해 역할(`viewer/editor/lead`)별 접근을 제어.

```sql
-- 사용자 프로필 (auth.users와 1:1, Supabase Auth 연동)
users (
  id            uuid pk references auth.users(id) on delete cascade,
  email         text unique not null,
  name          text not null,
  role          text not null default 'editor', -- viewer|editor|lead
  created_at    timestamptz default now()
)

-- 클라이언트
clients (
  id            uuid pk,
  name          text not null,            -- 예: 삼성, 부산대
  slug          text unique not null,
  description   text,
  owner_id      uuid references users(id),
  created_at    timestamptz default now()
)

-- 클라이언트 설정 카드 (override 규칙)
client_configs (
  id            uuid pk,
  client_id     uuid references clients(id) on delete cascade,
  title         text not null,            -- 예: 로그인 정책
  body          text not null,            -- 마크다운 설정 설명
  rule_type     text not null,            -- override|note|default
  applies_to    text,                     -- 연결 카테고리/FAQ 키워드
  severity      text default 'info',      -- info|warning|critical
  updated_by    uuid references users(id),
  updated_at    timestamptz default now()
)

-- FAQ
faqs (
  id            uuid pk,
  question      text not null,
  answer        text not null,            -- 마크다운
  category      text,
  tags          text[],
  status        text not null default 'draft', -- draft|verified|deprecated
  embedding     vector(1536),             -- question+answer 임베딩
  created_by    uuid references users(id),
  updated_by    uuid references users(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  deleted_at    timestamptz               -- soft delete
)

-- FAQ 버전 이력
faq_versions (
  id            uuid pk,
  faq_id        uuid references faqs(id) on delete cascade,
  question      text, answer text, status text,
  changed_by    uuid references users(id),
  changed_at    timestamptz default now()
)

-- 문의 (자산화 파이프라인의 원천 + 모든 채널 수집 결과)
inquiries (
  id              uuid pk,
  raw_text        text not null,
  client_id       uuid references clients(id),    -- 자동/수동 지정
  source          text not null default 'manual', -- manual|google_form|email|slack|kakao|sms|phone|csv_import|wiki_import
  source_ref      text,                           -- 외부 메시지 ID (Gmail message-id, Slack ts 등) — dedup 키
  intake_raw      jsonb,                          -- 원본 웹훅 페이로드 보관 (디버깅·재처리용)
  predicted_category text,
  prediction_score real,
  status          text default 'open',  -- open|answered|assetized
  answer_text     text,
  answered_by     uuid references users(id),
  linked_faq_id   uuid references faqs(id),
  created_at      timestamptz default now(),
  unique (source, source_ref)                     -- 채널별 중복 방지
)

-- 감사 로그
audit_logs (
  id          uuid pk,
  actor_id    uuid references users(id),
  entity      text, entity_id uuid,
  action      text,                   -- create|update|delete|status_change
  diff        jsonb,
  created_at  timestamptz default now()
)

-- 대화형 어시스턴트: 대화 세션
chat_sessions (
  id            uuid pk,
  user_id       uuid references users(id),
  client_id     uuid references clients(id),   -- 대화에서 선택/식별된 클라이언트(nullable)
  title         text,                          -- 첫 질문 요약
  created_at    timestamptz default now()
)

-- 대화 메시지
chat_messages (
  id            uuid pk,
  session_id    uuid references chat_sessions(id) on delete cascade,
  role          text not null,        -- user|assistant
  content       text not null,        -- 마크다운
  -- assistant 메시지에 한해, 답변 생성에 사용된 근거 출처
  citations     jsonb,                -- [{type:'inquiry'|'faq'|'config', id, title, score}]
  feedback      text,                 -- helpful|insufficient|wrong (null=미평가)
  created_at    timestamptz default now()
)

-- 검색/근거 로그 (랭킹 개선·감사용)
retrievals (
  id            uuid pk,
  message_id    uuid references chat_messages(id) on delete cascade,
  query_text    text not null,
  results       jsonb,                -- 검색된 후보와 유사도 점수
  grounded      boolean,              -- 임계치 이상 근거 확보 여부
  created_at    timestamptz default now()
)
```

> 구현 노트: `chat_messages.citations`의 각 항목은 `faqs` / `client_configs` / `inquiries`를 가리키는 다형(polymorphic) 참조다. 근거가 임계치 미만(`retrievals.grounded = false`)이면 어시스턴트는 단정 답변 대신 자산화 큐 등록을 제안한다(FR-7.5).

---

## 9. API 명세 (Supabase 기준)

Supabase 아키텍처에서는 **단순 CRUD는 `@supabase/supabase-js` 클라이언트가 직접 처리**하고(RLS가 권한 검증), **복잡한 비즈니스 로직은 Supabase Edge Functions**로 구현한다.

### 9.1 Supabase 클라이언트 직접 처리 (RLS 적용)

```ts
// 검색 — Supabase FTS + pgvector 하이브리드
supabase.rpc('search_knowledge', { query, client_id, category, status })
// → {faqs[], configs[]}

// FAQ CRUD
supabase.from('faqs').select(...)         // 목록/필터
supabase.from('faqs').insert({...})       // 생성 (임베딩은 Edge Function 후처리)
supabase.from('faqs').update({...})       // 수정 (faq_versions 트리거로 버전 자동 적립)
supabase.from('faqs').update({ deleted_at: now }) // soft delete

// 클라이언트 / 설정 카드
supabase.from('clients').select(...)
supabase.from('client_configs').select(...).eq('client_id', id)

// 문의 저장 / 자산화 큐 조회
supabase.from('inquiries').insert({...})
supabase.from('inquiries').select(...).eq('status', 'open')

// 대화 세션 / 메시지 이력
supabase.from('chat_sessions').insert({...})
supabase.from('chat_messages').select(...).eq('session_id', id)
```

### 9.2 Supabase Edge Functions (복잡 로직)

```
# ── 수집 파이프라인 (Intake) ──────────────────────────────

# 공통 정규화 수신 엔드포인트 (모든 채널 웹훅이 이곳으로 진입)
POST   /functions/v1/intake-normalize
       헤더 X-Source: google_form|email|slack|kakao|sms
       body: 채널별 원본 페이로드
       → 정규화 → inquiries 적재 (source_ref 기준 중복 무시)
       → 200 OK {inquiry_id} | 409 Conflict (중복)

# Google Forms Apps Script에서 호출하는 전용 엔드포인트 (위 공통 엔드포인트 래퍼)
POST   /functions/v1/intake-google-form
       {form_response_id, answers: {question: string, answer: string}[]}

# Gmail Pub/Sub Push 수신
POST   /functions/v1/intake-email
       Google Pub/Sub 형식 메시지 페이로드

# Slack Events API
POST   /functions/v1/intake-slack
       Slack event payload (message.channels)

# 카카오 채널 웹훅
POST   /functions/v1/intake-kakao

# Solapi / NHN Cloud SMS 수신 웹훅
POST   /functions/v1/intake-sms

# CSV/Excel 일괄 업로드 (프론트에서 파싱 후 배열로 전달)
POST   /functions/v1/intake-bulk
       {rows: [{raw_text, source, client_slug?, created_at?}[]]}
       → {inserted, skipped, errors[]}

# ── 임베딩·분류·자산화 ─────────────────────────────────────

# 임베딩 생성 (FAQ 저장/수정 후 자동 호출)
POST   /functions/v1/embed-faq
       {faq_id} → embedding 계산 후 faqs.embedding 업데이트

# 자동 분류 & 유사 추천
POST   /functions/v1/classify-inquiry
       {raw_text} → {category, score, client_guess, similar[]}

# 문의 자산화 (FAQ 생성 또는 병합 제안)
POST   /functions/v1/assetize
       {inquiry_id, answer} → {action: 'create'|'merge', faq_id, merge_target?}

# 대화형 답변 어시스턴트 (Ask the Hub)  — 스트리밍 응답
POST   /functions/v1/chat
       {session_id, content, client_id?}
       → 1) 질의 임베딩 · 하이브리드 검색
       → 2) 클라이언트 override 우선 적용
       → 3) grounded 답변 생성 (text/event-stream)
       → {answer, citations[], grounded, suggest_assetize}

# 피드백
POST   /functions/v1/chat-feedback
       {message_id, feedback: 'helpful'|'insufficient'|'wrong'}
```

### 9.3 Supabase Database Functions (RPC)

```sql
-- 하이브리드 검색 (FTS + pgvector)
create function search_knowledge(query text, client_id uuid, category text, status text)
returns table(...) as ...

-- FAQ 상태 전이 (draft→verified→deprecated)
create function update_faq_status(faq_id uuid, new_status text)
returns void as ...
```

> 에이전트 구현 지침: Edge Functions는 `supabase/functions/<name>/index.ts` (Deno)로 작성. 임베딩·LLM 호출은 `supabase/functions/_shared/ai.ts`로 추상화해 모킹 가능하게 구성. RAG 프롬프트는 **"제공된 근거에만 기반하고, 근거가 없으면 모른다고 답하라"** 시스템 지시를 강제하고, 출력에 citation 인덱스를 포함하도록 구조화. 모든 API 키·모델 설정은 Supabase 프로젝트 환경변수(`supabase secrets set`)로 관리.

---

## 10. 화면 (UX Flow)

1. **검색 홈** — 중앙 검색창, 최근/인기 FAQ, 자산화 큐 위젯(lead).
2. **검색 결과** — 좌측 FAQ 리스트, 우측 관련 클라이언트 override 패널.
3. **FAQ 상세** — 본문, 상태 배지, 버전 이력, "이 답변 사용" 복사.
4. **클라이언트 카드** — 설정 항목 목록, severity별 색상, 연결된 FAQ.
5. **문의 처리 화면** — 좌측 문의 원문 입력, 중앙 자동 분류·유사문서, 우측 답변 작성 + override 경고 배너 → 하단 "FAQ로 저장".
6. **자산화 큐 대시보드** — 빈출 미해결 문의 랭킹, 한 번에 FAQ 초안화.
7. **Ask the Hub (대화 화면)** — 챗 입력창 + 클라이언트 선택, 어시스턴트 답변 말풍선 아래에 **근거 출처 카드 목록**(과거 문의/FAQ/설정 카드, 클릭 시 원문 열림), 답변 하단에 `이 초안 복사` · `FAQ로 저장` · `피드백(도움됨/근거부족/틀림)` 버튼. 근거 부족 시 "참고 자료 없음 → 자산화 큐 등록" 안내.

---

## 11. 기술 스택 (바이브 코딩 권장)

| 레이어         | 선택                                                      | 비고                               |
| -------------- | --------------------------------------------------------- | ---------------------------------- |
| 프론트엔드     | React 19 + TypeScript + Vite + Tailwind CSS               | SPA, 단일 레포                     |
| UI             | shadcn/ui                                                 | 빠른 컴포넌트                      |
| 백엔드         | Supabase Edge Functions (Deno)                            | 분류·RAG·답변 생성·수집 정규화     |
| DB             | Supabase (PostgreSQL + pgvector 확장)                     | 의미 검색, 관리형 인프라           |
| 클라이언트 SDK | @supabase/supabase-js                                     | CRUD·실시간·Auth 통합              |
| 검색           | Supabase FTS (`to_tsvector`) + pgvector 하이브리드        | 키워드+의미                        |
| AI             | 임베딩 + LLM 분류 API (Edge Functions 내 호출)            | 서비스 레이어 분리, 키는 env       |
| 인증           | Supabase Auth (이메일/패스워드) + RLS 역할 정책           | 역할 3종 (`viewer/editor/lead`)    |
| 채널 커넥터    | Gmail API (Pub/Sub Watch), Slack Events API, 카카오 채널 웹훅, Solapi SMS 수신, Google Apps Script | 각 채널 → `intake-normalize` Edge Fn |
| 배포           | Vercel (프론트) + Supabase Cloud (DB·Functions·Auth)      | MVP 기준                           |

> 에이전트 지침: `vite` + React 앱으로 스캐폴딩하고 Supabase 프로젝트와 연동. `supabase/migrations/` 에 8장 스키마(pgvector 활성화 포함)를 반영하고, RLS 정책으로 역할별 접근 제어를 구현. 단순 CRUD는 `@supabase/supabase-js` 클라이언트로 직접 처리하고, 분류·RAG·답변 생성 등 복잡한 로직은 `supabase/functions/` Edge Functions로 분리. AI 호출은 `src/lib/ai.ts`로 추상화해 모킹 가능하게 구성.

---

## 12. 가정 & 리스크

**가정**

- 초기 FAQ/카드는 기존 흩어진 자료를 수동 이관해 시드한다(최소 50개 FAQ, 클라이언트 5곳).
- CS 팀이 답변 후 "FAQ로 저장"하는 습관을 들이면 베이스가 성장한다(H3).

**리스크 & 완화**
| 리스크 | 완화책 |
|---|---|
| 자산화가 귀찮아 안 쓰임 | 답변 흐름 안에 1클릭 내장, 큐로 리드가 넛지 |
| 자동 분류 정확도 낮음 | 신뢰도 점수 + 사람이 항상 확정, 피드백 적립 |
| 클라이언트 override 누락 | 답변 화면 강제 노출(critical은 확인 체크 필요) |
| 지식 노후화 | `verified` 만료 알림, deprecated 워크플로 |
| 어시스턴트 환각(없는 답 생성) | 검색 근거에만 기반, 문장별 출처 강제, 근거 부족 시 답변 보류·자산화 유도(FR-7.5) |
| 어시스턴트 답변 맹신 | "초안" 명시, 사람 확정 필수, override 충돌 경고, 피드백 루프 |

---

## 13. 릴리즈 계획 (Phased)

> 예시 3기능은 단계로 나눠 출시. MVP는 ①+② 지식 기반을 먼저 세워 즉시 가치를 내고, ③ 파이프라인을 얹는다.

**Phase 0 — 데이터 시드 & 초기 이관 (Phase 1과 병행, ~1주)**

- CSV/Excel 업로드 UI, 수동 복붙 단축 입력 폼, 위키 URL 임포트.
- 최소 목표: FAQ 50건 + 클라이언트 카드 5곳 + 과거 문의 100건 이관.
- 출시 가치: Phase 1 검색이 즉시 유의미한 결과를 내도록 초기 데이터 확보.

**Phase 1 — 지식 기반 (MVP, ~3주)**

- FAQ CRUD + 상태/버전, 클라이언트 카드 + override, 통합 검색(키워드+의미), 권한.
- 수동 문의 입력 폼 (전화·기타 채널 대응, FR-8.7).
- 출시 가치: 신규 담당자가 한 곳에서 검색·확신. 과거 문의 이관분으로 즉시 검색 가능.

**Phase 2 — 자동 수집 커넥터 + 자산화 파이프라인 + Ask the Hub (~4주)**

- **자동 수집 (FR-8.2~8.6):** Google Forms 웹훅, Gmail Pub/Sub, Slack Events API 순으로 연동. 카카오 채널·SMS는 비즈 채널/수신번호 개설 완료 시 추가.
- 문의 자동 분류·유사 추천, 원클릭 자산화·병합 제안, 자산화 큐.
- **대화형 답변 어시스턴트(FR-7):** RAG 검색 + 출처 기반 답변 + 클라이언트 override 우선 + 피드백 수집 + "FAQ로 저장" 자가 적립.
- 출시 가치: 수동 복붙 없이 문의가 자동으로 Hub에 쌓이고, 답변 흐름 안에서 지식이 자생적으로 성장.

**Phase 3 — 품질 루프 & 채널 확장 (후속)**

- 노후화 알림, 분류·답변 피드백 학습(랭킹 개선), 대시보드 지표(7장 표) 자동 집계, 어시스턴트 답변 정확도 모니터링.
- 전화 채널 STT 자동화 (클라우드 콜센터 + CLOVA Speech 연동).
- 수집 현황 대시보드 (FR-8.8): 채널별 인입량·미처리율·웹훅 오류 알림.

---

## 14. 성공 판정 (Definition of Done)

- Phase 1: 시드 데이터로 통합 검색·override 경고가 동작하고, 역할별 권한이 적용된다.
- Phase 2: 신규 문의 붙여넣기 → 분류·추천 → 답변 → 자산화가 한 화면에서 완결된다.
- 8주 후 7장 지표 중 **답변 자가완결률 70%**, **1차 응답 시간 -30%** 달성 여부로 가설(H2/H3) 검증.
