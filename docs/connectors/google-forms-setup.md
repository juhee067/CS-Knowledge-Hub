# Google Forms 커넥터 설정 가이드

> **소요 시간**: 약 10분  
> **선행 조건**: Google 계정, Supabase Edge Function 배포 완료

---

## 1. Edge Function URL 확인

Supabase 대시보드 > Edge Functions > `intake-google-form` > **Endpoint URL** 복사.

```
https://<project-ref>.supabase.co/functions/v1/intake-google-form
```

## 2. 환경변수 설정 (Supabase 대시보드)

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `WEBHOOK_SECRET_GOOGLE_FORM` | 임의의 난수 문자열 | Apps Script에서 전달할 시크릿 |
| `GOOGLE_FORM_CONTENT_FIELD` | `문의 내용` | 문의 텍스트가 담긴 폼 질문 제목 |
| `GOOGLE_FORM_CLIENT_FIELD` | `클라이언트` | 클라이언트 슬러그 필드 제목 (선택) |

## 3. Google Forms 설정

1. Google Forms에서 **문의 내용** 질문(긴 답변) 추가
2. 클라이언트 구분이 필요하면 **클라이언트** 질문(단답형) 추가  
   - 값은 Supabase `clients.slug`와 일치해야 함 (예: `samsung`)

## 4. Apps Script 설정

Google Forms > ⋮ > **스크립트 편집기** 에서 아래 코드 붙여넣기:

```javascript
const WEBHOOK_URL = 'https://<project-ref>.supabase.co/functions/v1/intake-google-form';
const WEBHOOK_SECRET = '<WEBHOOK_SECRET_GOOGLE_FORM 값>';

function onFormSubmit(e) {
  const response = e.response;
  const itemResponses = response.getItemResponses();
  const values = {};
  for (const item of itemResponses) {
    values[item.getItem().getTitle()] = item.getResponse();
  }

  const payload = {
    formId:     e.source.getId(),
    responseId: response.getId(),
    values,
  };

  UrlFetchApp.fetch(WEBHOOK_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-webhook-secret': WEBHOOK_SECRET },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
}
```

5. 저장 후 **트리거 추가** (시계 아이콘):
   - 실행 함수: `onFormSubmit`
   - 이벤트 소스: **스프레드시트에서**가 아닌 **양식에서**
   - 이벤트 유형: **양식 제출 시**

## 5. 테스트

1. 폼 테스트 제출
2. Supabase 대시보드 > Table Editor > `inquiries` 에서 `source = 'google_form'` 행 확인
3. 재제출 시 동일 `responseId` → `source_ref` 기준 중복 무시됨

## 완료 기준 (DoD)

- [ ] 테스트 폼 제출 후 **10초 내** `inquiries` 적재
- [ ] 재제출 시 중복 없음 (`connector_logs.status = 'duplicate'`)
