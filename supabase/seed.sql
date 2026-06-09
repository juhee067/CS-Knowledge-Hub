-- ============================================================================
-- 시드 데이터 — 챗봇 / 에이전트 빌더 / MCP 연동 서비스 특화
-- clients 4곳 · client_configs 6개 · FAQ 20건 · inquiries 30건
-- ============================================================================

-- ─── 클라이언트 4곳 ──────────────────────────────────────────────────────────

insert into public.clients (id, name, slug, description) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '벨루가AI',      'veluga',   '자사 플랫폼. 챗봇·에이전트 빌더·MCP 커넥터 제공.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '한국투자증권',  'kis',      '금융 챗봇 도입 고객. 규제 준수·면책 문구 필수.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '무신사',        'musinsa',  '커머스 CS 자동화. 반품·배송 FAQ 비중 높음.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '카카오엔터프라이즈', 'kakaoent', 'Kakao i 연동 파트너. 워크스페이스 계정 기반.')
on conflict (id) do nothing;

-- ─── 클라이언트 설정 카드 ─────────────────────────────────────────────────────

insert into public.client_configs (client_id, title, body, rule_type, applies_to, severity) values
  -- 한국투자증권
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '금융 규제 면책 문구 필수',
   '모든 투자 관련 답변 하단에 반드시 아래 문구를 포함하세요.
> 본 내용은 투자 권유가 아니며 투자 결과에 대한 책임은 투자자 본인에게 있습니다.',
   'override', '투자', 'critical'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'MCP 외부 데이터 연동 제한',
   '규제 상 실시간 시세 데이터를 MCP 툴로 직접 노출하면 안 됩니다. 공식 HTS/MTS 링크로 안내하세요.',
   'override', 'MCP', 'critical'),
  -- 무신사
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '반품 기한 커스텀',
   '무신사 스탠다드 상품은 수령 후 **14일** 이내 반품 가능합니다. 일반 FAQ의 7일 기준과 다릅니다.',
   'override', '반품', 'warning'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '에이전트 톤앤매너',
   '챗봇 답변은 반말체("~해요" 아닌 "~해")로 설정되어 있습니다. 답변 작성 시 톤을 맞춰주세요.',
   'note', '에이전트', 'info'),
  -- 카카오엔터프라이즈
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'Kakao i 워크스페이스 계정 전용',
   '로그인은 Kakao i 워크스페이스 계정만 허용됩니다. 개인 카카오 계정으로는 접근 불가합니다.',
   'override', '로그인', 'critical'),
  -- 벨루가AI (자사)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'MCP 베타 기능 안내',
   'MCP 커넥터는 현재 베타입니다. 안정성 이슈 발생 시 슬랙 #mcp-beta 채널로 즉시 에스컬레이션하세요.',
   'note', 'MCP', 'warning')
on conflict do nothing;

-- ─── FAQ 20건 ─────────────────────────────────────────────────────────────────

insert into public.faqs (question, answer, category, tags, status) values

-- 챗봇 빌더 (5건)
('챗봇을 처음 만들려면 어디서 시작하나요?',
 '대시보드 → **새 챗봇 만들기**를 클릭하세요. 템플릿(CS봇·영업봇·내부 헬프데스크)을 고르거나 빈 캔버스에서 시작할 수 있습니다.
기본 흐름: 시나리오 설계 → 지식베이스 연결 → 채널 배포.',
 '챗봇', ARRAY['챗봇','시작','온보딩'], 'verified'),

('챗봇 답변 품질이 낮을 때 어떻게 개선하나요?',
 '세 가지를 순서대로 점검하세요.
1. **지식베이스** — FAQ 커버리지가 충분한지 확인. 미매칭 로그에서 자주 등장하는 질문을 추가하세요.
2. **프롬프트** — 시스템 프롬프트에 답변 톤·금지어·우선 규칙을 명시하세요.
3. **모델 설정** — temperature 를 낮추면(0.2~0.4) 일관성이 높아집니다.',
 '챗봇', ARRAY['챗봇','품질','프롬프트','튜닝'], 'verified'),

('챗봇에 파일(PDF·엑셀)을 지식베이스로 올릴 수 있나요?',
 '지식베이스 → **파일 업로드**에서 PDF, DOCX, XLSX, CSV를 지원합니다. 업로드 후 자동으로 청크 분할·임베딩이 진행됩니다(보통 1~3분).
용량 제한: 파일당 50MB, 월 누적 500MB(Pro 플랜 이상).',
 '챗봇', ARRAY['챗봇','지식베이스','파일','PDF'], 'verified'),

('챗봇이 모르는 질문에 어떻게 대응하게 하나요?',
 '시나리오 편집기 → **폴백 노드**를 추가하세요. 권장 설정:
- 1차: "죄송합니다, 정확한 답변을 드리기 어렵습니다."
- 2차(선택): 상담사 연결 또는 티켓 생성 액션 연결.',
 '챗봇', ARRAY['챗봇','폴백','폴오버'], 'verified'),

('멀티턴 대화(이전 맥락 기억)는 어떻게 설정하나요?',
 '챗봇 설정 → **메모리** 탭에서 `세션 메모리`를 켜세요. 기본 유지 시간은 30분이며 최대 24시간까지 조정 가능합니다.
장기 기억이 필요하면 에이전트 빌더의 `사용자 프로필 저장` 액션을 함께 사용하세요.',
 '챗봇', ARRAY['챗봇','멀티턴','메모리','대화'], 'verified'),

-- 에이전트 빌더 (5건)
('에이전트와 챗봇의 차이가 뭔가요?',
 '| | 챗봇 | 에이전트 |
|---|---|---|
| 동작 | 시나리오 기반 응답 | 목표 기반 자율 실행 |
| 툴 사용 | 제한적 | 외부 API·DB 직접 호출 |
| 복잡도 | 낮음 | 높음 |

CS 자동응답엔 챗봇, 여러 시스템을 오가며 작업을 처리해야 하면 에이전트를 권장합니다.',
 '에이전트', ARRAY['에이전트','챗봇','차이'], 'verified'),

('에이전트에 커스텀 툴(API)을 연결하려면?',
 '에이전트 빌더 → **툴 추가** → `HTTP 요청` 선택 후 엔드포인트·헤더·바디 스키마를 입력하세요.
툴 설명(description)을 상세히 작성할수록 LLM이 적절한 상황에서 툴을 선택합니다.',
 '에이전트', ARRAY['에이전트','툴','API','커스텀'], 'verified'),

('에이전트 실행 로그를 어디서 확인하나요?',
 '대시보드 → 해당 에이전트 → **실행 로그** 탭에서 스텝별 툴 호출, 토큰 사용량, 오류를 확인할 수 있습니다.
7일치 로그가 기본 보관되며, Pro 플랜은 90일까지 보관됩니다.',
 '에이전트', ARRAY['에이전트','로그','디버깅'], 'verified'),

('에이전트가 루프에 빠질 때 어떻게 막나요?',
 '에이전트 설정 → **최대 스텝 수**를 설정하세요(권장: 15~20). 초과 시 자동 중단되며 사용자에게 안내 메시지를 보냅니다.
반복 패턴이 감지되면 `루프 탐지` 옵션을 활성화하면 즉시 중단됩니다.',
 '에이전트', ARRAY['에이전트','루프','안전'], 'verified'),

('에이전트 결과물을 Slack·이메일로 자동 전송하려면?',
 '에이전트 빌더 → 마지막 노드 → **액션 추가** → `알림 보내기`를 선택하세요. Slack·이메일·웹훅을 지원합니다.
Slack은 OAuth 연동, 이메일은 SMTP 또는 내장 발송 서비스를 사용합니다.',
 '에이전트', ARRAY['에이전트','Slack','이메일','알림'], 'verified'),

-- MCP 연동 (5건)
('MCP 커넥터가 무엇인가요?',
 'MCP(Model Context Protocol)는 LLM이 외부 툴·데이터소스와 표준화된 방식으로 통신하는 프로토콜입니다.
저희 플랫폼에서는 MCP 서버를 **노코드로 등록**하면 챗봇·에이전트가 해당 툴을 자동으로 활용할 수 있습니다.',
 'MCP', ARRAY['MCP','커넥터','프로토콜'], 'verified'),

('MCP 서버를 등록하는 방법은?',
 '설정 → **MCP 커넥터** → `서버 추가`를 클릭하세요.
- `SSE` 방식: 서버 URL 입력
- `stdio` 방식: 실행 커맨드 입력
등록 후 **연결 테스트**를 실행하면 사용 가능한 툴 목록이 자동으로 로드됩니다.',
 'MCP', ARRAY['MCP','서버','등록'], 'verified'),

('내 MCP 서버가 연결은 됐는데 툴이 안 보여요.',
 '순서대로 확인하세요.
1. MCP 서버가 `tools/list` 엔드포인트를 올바르게 구현했는지 확인
2. 툴 스키마(inputSchema)가 JSON Schema Draft-7 형식인지 확인
3. 서버 로그에서 핸드셰이크 오류 여부 확인
그래도 안 되면 서버 URL과 에러 로그를 고객센터에 공유해 주세요.',
 'MCP', ARRAY['MCP','툴','연결','디버깅'], 'verified'),

('MCP 커넥터로 사내 DB에 연결하는 게 안전한가요?',
 '네트워크 보안 체크리스트:
- MCP 서버를 DMZ 또는 프라이빗 서브넷에 배치
- API 키·토큰은 환경변수로만 관리, 플랫폼에 직접 입력 금지
- 읽기 전용 DB 계정 사용 권장
- 플랫폼 → MCP 서버 구간은 TLS 1.2+ 필수',
 'MCP', ARRAY['MCP','보안','DB','네트워크'], 'verified'),

('Claude Desktop에서 저희 MCP 서버를 쓸 수 있나요?',
 '가능합니다. `claude_desktop_config.json`에 아래처럼 추가하세요.
```json
{
  "mcpServers": {
    "veluga": {
      "command": "npx",
      "args": ["-y", "@veluga/mcp-server"],
      "env": { "API_KEY": "your-key" }
    }
  }
}
```
설정 후 Claude Desktop을 재시작하면 툴이 자동으로 인식됩니다.',
 'MCP', ARRAY['MCP','Claude Desktop','설정'], 'verified'),

-- 계정·플랜·빌링 (5건)
('무료 플랜과 Pro 플랜의 차이는 무엇인가요?',
 '| 항목 | 무료 | Pro |
|---|---|---|
| 챗봇 수 | 1개 | 무제한 |
| 월 메시지 | 1,000건 | 50,000건 |
| MCP 커넥터 | 미지원 | 지원 |
| 에이전트 빌더 | 미지원 | 지원 |
| 로그 보관 | 7일 | 90일 |

Pro 업그레이드는 설정 → 플랜 관리에서 가능합니다.',
 '계정/플랜', ARRAY['플랜','Pro','무료','가격'], 'verified'),

('팀 멤버를 초대하려면 어떻게 하나요?',
 '설정 → **팀 관리** → `멤버 초대` 버튼을 클릭하고 이메일을 입력하세요.
역할: `오너` > `에디터` > `뷰어`. 에디터는 챗봇·에이전트 편집 가능, 뷰어는 로그·통계만 열람 가능합니다.',
 '계정/플랜', ARRAY['팀','초대','권한'], 'verified'),

('API 키는 어디서 발급받나요?',
 '설정 → **API 키** → `새 키 생성`을 클릭하세요.
키는 생성 시 한 번만 표시됩니다. 반드시 안전한 곳에 저장하세요.
키 유출 시 즉시 **비활성화** 후 재발급하시기 바랍니다.',
 '계정/플랜', ARRAY['API키','발급','보안'], 'verified'),

('사용량 초과 시 챗봇이 어떻게 되나요?',
 '무료 플랜: 월 한도 초과 시 챗봇이 일시 중단됩니다. 사용자에게는 "현재 서비스를 이용할 수 없습니다" 메시지가 표시됩니다.
Pro 플랜: 초과분은 건당 ₩5원으로 자동 과금됩니다(설정에서 상한 설정 가능).',
 '계정/플랜', ARRAY['사용량','한도','과금'], 'verified'),

('데이터를 삭제하거나 계정을 탈퇴하면 어떻게 되나요?',
 '계정 탈퇴 시 모든 챗봇·에이전트·지식베이스·대화 로그가 30일 후 완전 삭제됩니다.
탈퇴 전 **데이터 내보내기**(설정 → 내 데이터 → 내보내기)를 통해 백업을 권장합니다.',
 '계정/플랜', ARRAY['탈퇴','데이터삭제','백업'], 'verified')

on conflict do nothing;

-- ─── 문의 30건 ────────────────────────────────────────────────────────────────

insert into public.inquiries (raw_text, client_id, source, source_ref, status, predicted_category) values
('챗봇 답변이 자꾸 엉뚱한 내용을 말해요. 프롬프트를 어떻게 고쳐야 하나요?', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'manual', 'INQ-001', 'open', '챗봇'),
('MCP 서버 연결했는데 툴 목록이 비어있어요', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'slack', 'INQ-002', 'open', 'MCP'),
('에이전트가 같은 툴을 10번 반복 호출하다가 멈췄어요', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'INQ-003', 'open', '에이전트'),
('Pro 플랜으로 업그레이드했는데 MCP 메뉴가 안 보여요', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'manual', 'INQ-004', 'answered', '계정/플랜'),
('PDF 파일 업로드 후 임베딩이 1시간째 진행 중이에요', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'email', 'INQ-005', 'open', '챗봇'),
('Claude Desktop에 MCP 서버 설정했는데 툴이 안 나와요', null, 'google_form', 'INQ-006', 'answered', 'MCP'),
('팀원을 에디터로 초대했는데 뷰어로 들어왔어요', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'slack', 'INQ-007', 'answered', '계정/플랜'),
('챗봇이 이전 대화 내용을 기억 못해요. 멀티턴 설정 어떻게 해요?', null, 'manual', 'INQ-008', 'open', '챗봇'),
('에이전트에서 Slack 알림이 안 가요. 연동은 됐는데요', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'INQ-009', 'answered', '에이전트'),
('투자 관련 답변에 면책 문구가 자동으로 들어가게 할 수 있나요?', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'email', 'INQ-010', 'answered', '챗봇'),
('API 키를 실수로 코드에 올렸어요. 지금 바로 비활성화해야 하나요?', null, 'slack', 'INQ-011', 'answered', '계정/플랜'),
('에이전트 로그 90일 보관이라고 했는데 7일 넘어가니 없어졌어요', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'INQ-012', 'open', '에이전트'),
('MCP 커넥터로 사내 PostgreSQL에 붙이려는데 방화벽 설정이 어떻게 돼요?', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'email', 'INQ-013', 'open', 'MCP'),
('챗봇 폴백 메시지를 클라이언트마다 다르게 설정할 수 있나요?', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'manual', 'INQ-014', 'answered', '챗봇'),
('월 메시지 한도가 얼마나 남았는지 확인하는 방법이 있나요?', null, 'google_form', 'INQ-015', 'answered', '계정/플랜'),
('에이전트를 cron으로 스케줄 실행하고 싶어요', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'slack', 'INQ-016', 'open', '에이전트'),
('지식베이스에 올린 파일 내용이 검색이 잘 안 돼요', null, 'manual', 'INQ-017', 'open', '챗봇'),
('MCP 서버 응답이 느린데 타임아웃 시간을 늘릴 수 있나요?', null, 'email', 'INQ-018', 'answered', 'MCP'),
('Kakao i 계정으로 로그인이 안 됩니다', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'slack', 'INQ-019', 'open', '계정/플랜'),
('에이전트 실행 결과를 노션 페이지에 자동으로 저장하고 싶어요', null, 'google_form', 'INQ-020', 'answered', '에이전트'),
('챗봇 톤앤매너를 반말로 바꾸는 방법을 알려주세요', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'manual', 'INQ-021', 'answered', '챗봇'),
('MCP 커넥터 베타에서 자꾸 연결이 끊겨요', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'slack', 'INQ-022', 'open', 'MCP'),
('팀 계정에서 오너 권한을 다른 사람에게 넘길 수 있나요?', null, 'email', 'INQ-023', 'answered', '계정/플랜'),
('에이전트가 툴을 잘못 선택해서 엉뚱한 API를 호출해요', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'INQ-024', 'open', '에이전트'),
('챗봇 대화 로그를 CSV로 다운로드할 수 있나요?', null, 'google_form', 'INQ-025', 'answered', '챗봇'),
('실시간 주가 데이터를 MCP로 챗봇에 연결하고 싶은데 가능한가요?', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'email', 'INQ-026', 'open', 'MCP'),
('무료 플랜인데 에이전트 빌더 탭이 잠겨있어요', null, 'manual', 'INQ-027', 'answered', '계정/플랜'),
('지식베이스 없이 순수 LLM 답변만 사용할 수 있나요?', null, 'google_form', 'INQ-028', 'answered', '챗봇'),
('MCP 툴 호출 시 인증 토큰을 어떻게 안전하게 넣나요?', null, 'slack', 'INQ-029', 'open', 'MCP'),
('에이전트 하나가 다른 에이전트를 호출하는 구조가 가능한가요?', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'email', 'INQ-030', 'open', '에이전트')
on conflict (source, source_ref) do nothing;
