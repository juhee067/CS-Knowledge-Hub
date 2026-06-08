-- ============================================================================
-- 로컬 개발용 시드 데이터 (clients / client_configs / faqs)
-- 사용자(users)는 auth 가입 시 트리거로 생성되므로 여기서는 생략.
-- created_by/updated_by 는 nullable 이라 비워둔다.
-- `supabase db reset` 시 자동 적용된다.
-- ============================================================================

insert into public.clients (id, name, slug, description) values
  ('11111111-1111-1111-1111-111111111111', '삼성', 'samsung', '대기업 클라이언트. SSO 기반 로그인.'),
  ('22222222-2222-2222-2222-222222222222', '부산대', 'pnu', '대학 클라이언트. 권한 정책이 까다로움.')
on conflict (id) do nothing;

insert into public.client_configs (client_id, title, body, rule_type, applies_to, severity) values
  ('11111111-1111-1111-1111-111111111111', '로그인 정책',
   '삼성은 **SSO 로그인만 허용**합니다. 비밀번호 재설정 안내를 하면 안 됩니다.',
   'override', '비밀번호 재설정', 'critical'),
  ('11111111-1111-1111-1111-111111111111', '도메인',
   '계정 이메일은 `@samsung.com` 도메인만 유효합니다.',
   'note', '계정', 'info'),
  ('22222222-2222-2222-2222-222222222222', '권한 정책',
   '부산대는 학과 단위 권한 분리가 필요합니다. 관리자 권한 부여는 본사 승인 필수.',
   'override', '권한', 'warning')
on conflict do nothing;

insert into public.faqs (question, answer, category, tags, status) values
  ('비밀번호를 잊어버렸어요. 어떻게 재설정하나요?',
   '로그인 화면의 **비밀번호 찾기**를 눌러 가입 이메일로 재설정 링크를 받으세요.\n\n> ⚠️ 일부 클라이언트(예: 삼성)는 SSO만 허용하여 비밀번호 재설정이 불가합니다. 클라이언트 설정 카드를 확인하세요.',
   '계정', array['비밀번호','로그인','계정'], 'verified'),
  ('결제가 이중으로 청구되었습니다.',
   '이중 청구 확인 후 영업일 3일 내 재정산됩니다. 결제 내역 캡처를 요청하세요.',
   '결제', array['결제','환불','이중결제'], 'verified'),
  ('회원 탈퇴는 어떻게 하나요?',
   '설정 > 계정 > 회원 탈퇴 메뉴에서 진행할 수 있습니다. (초안)',
   '계정', array['탈퇴','계정'], 'draft')
on conflict do nothing;
