-- ============================================================================
-- 테스트 계정 시드: test@veluga.io / test1234
--   - auth.users 직접 insert (pgcrypto crypt 로 bcrypt 해시)
--   - auth.identities 도 함께 생성해야 email/password 로그인이 동작
--   - public.users 프로필은 on_auth_user_created 트리거가 자동 생성
--   - 이미 존재하면 아무것도 하지 않음 (재실행 안전)
-- ============================================================================
do $$
declare
  v_uid uuid;
begin
  if exists (select 1 from auth.users where email = 'test@veluga.io') then
    return;
  end if;

  v_uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated',
    'test@veluga.io', crypt('test1234', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"테스트 계정"}'::jsonb,
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_uid, v_uid::text,
    json_build_object('sub', v_uid::text, 'email', 'test@veluga.io', 'email_verified', true),
    'email', now(), now(), now()
  );
end $$;
