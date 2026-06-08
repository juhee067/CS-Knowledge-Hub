# Slack 커넥터 설정 가이드

> **소요 시간**: 약 15분  
> **선행 조건**: Slack 워크스페이스 Admin 권한

---

## 1. Slack App 생성

1. [api.slack.com/apps](https://api.slack.com/apps) > **Create New App** > **From scratch**
2. App 이름: `CS Knowledge Hub Intake`
3. 워크스페이스 선택 후 **Create App**

## 2. OAuth 및 권한 설정

**OAuth & Permissions** > **Bot Token Scopes**에 추가:
- `channels:history` — 공개 채널 메시지 읽기
- `groups:history` — 비공개 채널 메시지 읽기 (필요 시)
- `app_mentions:read` — 앱 멘션 수신

**Install to Workspace** 클릭 → `xoxb-...` 형태의 **Bot User OAuth Token** 복사

## 3. Events API 설정

1. **Event Subscriptions** > Enable Events: **On**
2. **Request URL**: 
   ```
   https://<project-ref>.supabase.co/functions/v1/intake-slack
   ```
   > Slack이 URL에 challenge를 보냅니다. Edge Function이 자동 응답합니다.
3. **Subscribe to bot events** > `message.channels` 추가  
   (비공개 채널도 필요 시 `message.groups` 추가)

## 4. 모니터링 채널 설정

봇을 수집 대상 채널에 초대:
```
/invite @CS Knowledge Hub Intake
```

## 5. Supabase 환경변수 설정

| 변수명 | 값 |
|--------|-----|
| `SLACK_SIGNING_SECRET` | App 설정 > Basic Information > **Signing Secret** |
| `SLACK_BOT_TOKEN` | `xoxb-...` 형태의 Bot Token |
| `SLACK_CHANNEL_ID` | 특정 채널 ID만 수집 (선택, 없으면 전체 채널) |

**채널 ID 확인**: Slack 채널 오른쪽 클릭 > 채널 정보 보기 > 하단 채널 ID 복사

## 6. 테스트

1. 모니터링 채널에 테스트 메시지 전송
2. **5초 내** `inquiries`에 `source = 'slack'` 행 확인
3. `source_ref = '<channel_id>_<timestamp>'` 형식으로 중복 방지

## 완료 기준 (DoD)

- [ ] Slack 메시지가 **5초 내** `inquiries` 적재
- [ ] 봇 메시지·수정·삭제 이벤트 무시됨
- [ ] HMAC-SHA256 서명 검증 통과 확인

## ⚠️ 카카오/SMS 미개설 시

`intake-kakao`, `intake-sms`는 환경변수(`WEBHOOK_SECRET_KAKAO`, `SOLAPI_WEBHOOK_SECRET`) 미설정 시 **501 Not Implemented** 반환.  
채널 개설 전까지는 **빠른 입력** (`/quick`) 페이지를 대체 수단으로 사용하세요.
