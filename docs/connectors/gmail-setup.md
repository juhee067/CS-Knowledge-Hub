# Gmail 커넥터 설정 가이드

> **소요 시간**: 약 30분  
> **선행 조건**: Google Cloud 프로젝트, Gmail API 활성화, Pub/Sub 활성화

---

## 1. Google Cloud 설정

### 1-1. OAuth2 클라이언트 생성
1. GCP Console > **API 및 서비스** > 사용자 인증 정보 > **OAuth 2.0 클라이언트 ID** 생성
2. 유형: **웹 애플리케이션**
3. 승인된 리디렉션 URI: `https://developers.google.com/oauthplayground`

### 1-2. Refresh Token 발급
1. [OAuth Playground](https://developers.google.com/oauthplayground) 열기
2. 오른쪽 상단 ⚙️ > **Use your own OAuth credentials** 체크
3. Client ID / Secret 입력
4. Scope: `https://www.googleapis.com/auth/gmail.readonly`
5. **Authorize APIs** → **Exchange authorization code for tokens** → `refresh_token` 복사

### 1-3. Pub/Sub 주제 생성
```bash
gcloud pubsub topics create gmail-intake
gcloud pubsub subscriptions create gmail-intake-push \
  --topic=gmail-intake \
  --push-endpoint=https://<project-ref>.supabase.co/functions/v1/intake-email?token=<WEBHOOK_SECRET_EMAIL> \
  --ack-deadline=30
```

### 1-4. Gmail Watch 등록 (7일마다 갱신 필요)
```bash
curl -X POST "https://gmail.googleapis.com/gmail/v1/users/me/watch" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "topicName": "projects/<project-id>/topics/gmail-intake",
    "labelIds": ["INBOX"]
  }'
```

> **자동 갱신**: 7일 후 만료되므로 Supabase Cron 또는 Cloud Scheduler로 갱신 호출을 예약하세요.

## 2. Supabase 환경변수 설정

| 변수명 | 값 |
|--------|-----|
| `GOOGLE_CLIENT_ID` | OAuth2 클라이언트 ID |
| `GOOGLE_CLIENT_SECRET` | OAuth2 클라이언트 시크릿 |
| `GOOGLE_REFRESH_TOKEN` | 1-2 에서 발급한 refresh token |
| `GMAIL_USER_EMAIL` | 모니터링할 Gmail 주소 |
| `GMAIL_LABEL_ID` | 필터링할 레이블 ID (선택, 없으면 INBOX 전체) |
| `WEBHOOK_SECRET_EMAIL` | Pub/Sub 검증 토큰 (임의 문자열) |

## 3. 특정 레이블 필터링 (선택)

특정 레이블(예: "CS문의")을 만들고 Gmail 필터로 자동 적용하면  
해당 레이블 메일만 `intake-email` 로 수신됩니다.

```bash
# 레이블 ID 조회
curl "https://gmail.googleapis.com/gmail/v1/users/me/labels" \
  -H "Authorization: Bearer <access_token>"
```

## 4. 테스트

1. 모니터링 Gmail로 테스트 메일 발송
2. 약 1분 내 Pub/Sub → Edge Function → `inquiries` 적재 확인
3. 동일 메시지 ID 재수신 시 중복 무시 확인

## 완료 기준 (DoD)

- [ ] 지정 레이블 메일이 **1분 내** `inquiries` 적재
- [ ] `source = 'email'`, `source_ref = <gmail_message_id>`
