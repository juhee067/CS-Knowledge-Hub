-- ============================================================================
-- CS Knowledge Hub — 함수 & 트리거
--  1) auth.users → public.users 프로필 자동 생성
--  2) FAQ 수정 시 이전 버전 보존 (faq_versions) + updated_at 갱신 (FR-2.3)
--  3) FAQ 상태 전이 RPC (FR-2.2)
--
-- 역할 조회 헬퍼(public.current_user_role / is_lead / is_editor_or_lead)는
-- 다음 마이그레이션(000003_rls_policies.sql)에서 정의한다. plpgsql 함수 본문은
-- 호출 시점에 함수를 해석하므로 정의 순서 문제는 없다.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) auth.users 생성 시 public.users 프로필 자동 생성
--    name 은 메타데이터(full_name) → 없으면 이메일 local-part 사용
--    최초 가입자는 lead, 이후는 editor (운영 중 lead 가 조정)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select case when count(*) = 0 then 'lead' else 'editor' end
    into v_role from public.users;

  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    v_role
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2) FAQ 수정 시 이전 버전 스냅샷 보존 + updated_at 갱신
-- ----------------------------------------------------------------------------
create or replace function public.faq_save_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 의미 있는 변경(질문/답변/상태)이 있을 때만 이전 스냅샷 저장
  if (old.question is distinct from new.question)
     or (old.answer is distinct from new.answer)
     or (old.status is distinct from new.status) then
    insert into public.faq_versions (faq_id, question, answer, status, changed_by)
    values (old.id, old.question, old.answer, old.status, auth.uid());
  end if;

  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists faqs_save_version on public.faqs;
create trigger faqs_save_version
  before update on public.faqs
  for each row execute function public.faq_save_version();

-- ----------------------------------------------------------------------------
-- 3) FAQ 상태 전이 RPC (editor/lead 만, deprecated/verified 승격은 lead 권장)
-- ----------------------------------------------------------------------------
create or replace function public.update_faq_status(p_faq_id uuid, p_new_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_editor_or_lead() then
    raise exception '권한이 없습니다 (editor/lead 필요)';
  end if;

  if p_new_status not in ('draft', 'verified', 'deprecated') then
    raise exception '허용되지 않는 상태: %', p_new_status;
  end if;

  -- verified 승격은 lead 만 허용
  if p_new_status = 'verified' and not public.is_lead() then
    raise exception 'verified 승격은 lead 권한이 필요합니다';
  end if;

  update public.faqs
     set status = p_new_status
   where id = p_faq_id and deleted_at is null;
end;
$$;
