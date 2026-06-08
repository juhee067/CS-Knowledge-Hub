-- ============================================================================
-- RLS 정책 골격 (viewer / editor / lead)
--  - viewer : 읽기 전용
--  - editor : 콘텐츠 생성·수정 (clients, client_configs, faqs, inquiries)
--  - lead   : 전체 권한 (삭제, 사용자 역할 관리, 감사 로그 열람)
-- 역할 헬퍼(public.can_edit / public.is_lead / public.current_role)는
-- 0002_functions_triggers 에서 SECURITY DEFINER 로 정의됨.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- RLS 활성화
-- ----------------------------------------------------------------------------
alter table public.users          enable row level security;
alter table public.clients        enable row level security;
alter table public.client_configs enable row level security;
alter table public.faqs           enable row level security;
alter table public.faq_versions   enable row level security;
alter table public.inquiries      enable row level security;
alter table public.audit_logs     enable row level security;
alter table public.chat_sessions  enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.retrievals     enable row level security;

-- ----------------------------------------------------------------------------
-- users : 인증 사용자는 모든 프로필 조회 가능. 본인 프로필 수정 가능.
--         lead 는 모든 프로필(역할 포함) 수정 가능. INSERT 는 트리거(definer)가 담당.
-- ----------------------------------------------------------------------------
create policy users_select on public.users
  for select to authenticated using (true);
create policy users_update_self on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy users_update_lead on public.users
  for update to authenticated using (public.is_lead()) with check (public.is_lead());

-- ----------------------------------------------------------------------------
-- clients : 전원 조회. editor+ 생성·수정. lead 삭제.
-- ----------------------------------------------------------------------------
create policy clients_select on public.clients
  for select to authenticated using (true);
create policy clients_insert on public.clients
  for insert to authenticated with check (public.can_edit());
create policy clients_update on public.clients
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy clients_delete on public.clients
  for delete to authenticated using (public.is_lead());

-- ----------------------------------------------------------------------------
-- client_configs : 전원 조회. editor+ 생성·수정. lead 삭제.
-- ----------------------------------------------------------------------------
create policy client_configs_select on public.client_configs
  for select to authenticated using (true);
create policy client_configs_insert on public.client_configs
  for insert to authenticated with check (public.can_edit());
create policy client_configs_update on public.client_configs
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy client_configs_delete on public.client_configs
  for delete to authenticated using (public.is_lead());

-- ----------------------------------------------------------------------------
-- faqs : 전원 조회. editor+ 생성·수정(soft delete 포함). lead 하드 삭제.
-- ----------------------------------------------------------------------------
create policy faqs_select on public.faqs
  for select to authenticated using (true);
create policy faqs_insert on public.faqs
  for insert to authenticated with check (public.can_edit());
create policy faqs_update on public.faqs
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy faqs_delete on public.faqs
  for delete to authenticated using (public.is_lead());

-- ----------------------------------------------------------------------------
-- faq_versions : 전원 조회. 쓰기는 트리거(definer)만 → 직접 INSERT/UPDATE/DELETE 불가.
-- ----------------------------------------------------------------------------
create policy faq_versions_select on public.faq_versions
  for select to authenticated using (true);

-- ----------------------------------------------------------------------------
-- inquiries : 전원 조회. editor+ 생성·수정. lead 삭제.
--             (채널 자동 수집은 service_role 키가 RLS 우회)
-- ----------------------------------------------------------------------------
create policy inquiries_select on public.inquiries
  for select to authenticated using (true);
create policy inquiries_insert on public.inquiries
  for insert to authenticated with check (public.can_edit());
create policy inquiries_update on public.inquiries
  for update to authenticated using (public.can_edit()) with check (public.can_edit());
create policy inquiries_delete on public.inquiries
  for delete to authenticated using (public.is_lead());

-- ----------------------------------------------------------------------------
-- audit_logs : lead 만 열람. editor+ 는 본인 행위 기록 INSERT 가능.
-- ----------------------------------------------------------------------------
create policy audit_logs_select_lead on public.audit_logs
  for select to authenticated using (public.is_lead());
create policy audit_logs_insert on public.audit_logs
  for insert to authenticated with check (public.can_edit() and actor_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 대화형 어시스턴트 : 사용자는 본인 세션/메시지/검색로그만 접근.
-- ----------------------------------------------------------------------------
create policy chat_sessions_owner on public.chat_sessions
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy chat_messages_owner on public.chat_messages
  for all to authenticated
  using (exists (
    select 1 from public.chat_sessions s
    where s.id = chat_messages.session_id and s.user_id = auth.uid()))
  with check (exists (
    select 1 from public.chat_sessions s
    where s.id = chat_messages.session_id and s.user_id = auth.uid()));

create policy retrievals_owner on public.retrievals
  for all to authenticated
  using (exists (
    select 1 from public.chat_messages m
    join public.chat_sessions s on s.id = m.session_id
    where m.id = retrievals.message_id and s.user_id = auth.uid()))
  with check (exists (
    select 1 from public.chat_messages m
    join public.chat_sessions s on s.id = m.session_id
    where m.id = retrievals.message_id and s.user_id = auth.uid()));
