-- ============================================================================
-- CS Knowledge Hub — 초기 스키마 (PRD 8장)
-- PostgreSQL / Supabase. 사용자 인증은 Supabase Auth(auth.users)를 사용하고,
-- public.users 는 프로필·역할 보관용 공개 테이블로 auth.users.id 를 참조한다.
-- 함수·트리거·RPC 는 0002, RLS 정책은 0003 마이그레이션에서 정의한다.
-- ============================================================================

-- 확장
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";      -- pgvector (임베딩)

-- ----------------------------------------------------------------------------
-- 사용자 프로필 (auth.users 와 1:1)
-- ----------------------------------------------------------------------------
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text unique not null,
  name        text not null,
  role        text not null default 'editor'
                check (role in ('viewer', 'editor', 'lead')),
  created_at  timestamptz not null default now()
);
comment on table public.users is '프로필·역할 (auth.users 1:1). role: viewer|editor|lead';

-- ----------------------------------------------------------------------------
-- 클라이언트
-- ----------------------------------------------------------------------------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  description text,
  owner_id    uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 클라이언트 설정 카드 (override 규칙)
-- ----------------------------------------------------------------------------
create table public.client_configs (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id) on delete cascade,
  title       text not null,
  body        text not null,                            -- 마크다운
  rule_type   text not null
                check (rule_type in ('override', 'note', 'default')),
  applies_to  text,                                     -- 연결 카테고리/FAQ 키워드
  severity    text not null default 'info'
                check (severity in ('info', 'warning', 'critical')),
  updated_by  uuid references public.users (id) on delete set null,
  updated_at  timestamptz not null default now()
);
create index client_configs_client_id_idx on public.client_configs (client_id);

-- ----------------------------------------------------------------------------
-- FAQ
-- ----------------------------------------------------------------------------
create table public.faqs (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  answer      text not null,                            -- 마크다운
  category    text,
  tags        text[],
  status      text not null default 'draft'
                check (status in ('draft', 'verified', 'deprecated')),
  embedding   vector(1536),                             -- question+answer 임베딩
  created_by  uuid references public.users (id) on delete set null,
  updated_by  uuid references public.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz                               -- soft delete
);
create index faqs_status_idx   on public.faqs (status) where deleted_at is null;
create index faqs_category_idx on public.faqs (category);
create index faqs_tags_idx     on public.faqs using gin (tags);

-- ----------------------------------------------------------------------------
-- FAQ 버전 이력
-- ----------------------------------------------------------------------------
create table public.faq_versions (
  id          uuid primary key default gen_random_uuid(),
  faq_id      uuid not null references public.faqs (id) on delete cascade,
  question    text,
  answer      text,
  status      text,
  changed_by  uuid references public.users (id) on delete set null,
  changed_at  timestamptz not null default now()
);
create index faq_versions_faq_id_idx on public.faq_versions (faq_id);

-- ----------------------------------------------------------------------------
-- 문의 (자산화 파이프라인의 원천 + 모든 채널 수집 결과)
-- ----------------------------------------------------------------------------
create table public.inquiries (
  id                 uuid primary key default gen_random_uuid(),
  raw_text           text not null,
  client_id          uuid references public.clients (id) on delete set null,
  source             text not null default 'manual'
                       check (source in (
                         'manual', 'google_form', 'email', 'slack', 'kakao',
                         'sms', 'phone', 'csv_import', 'wiki_import')),
  source_ref         text,                              -- 외부 메시지 ID (dedup 키)
  intake_raw         jsonb,                             -- 원본 웹훅 페이로드
  predicted_category text,
  prediction_score   real,
  status             text not null default 'open'
                       check (status in ('open', 'answered', 'assetized')),
  answer_text        text,
  answered_by        uuid references public.users (id) on delete set null,
  linked_faq_id      uuid references public.faqs (id) on delete set null,
  created_at         timestamptz not null default now(),
  unique (source, source_ref)                           -- 채널별 중복 방지
);
create index inquiries_status_idx    on public.inquiries (status);
create index inquiries_client_id_idx on public.inquiries (client_id);

-- ----------------------------------------------------------------------------
-- 감사 로그
-- ----------------------------------------------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.users (id) on delete set null,
  entity      text,
  entity_id   uuid,
  action      text check (action in ('create', 'update', 'delete', 'status_change')),
  diff        jsonb,
  created_at  timestamptz not null default now()
);
create index audit_logs_entity_idx   on public.audit_logs (entity, entity_id);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);

-- ----------------------------------------------------------------------------
-- 대화형 어시스턴트: 대화 세션 / 메시지 / 검색 로그
-- ----------------------------------------------------------------------------
create table public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.users (id) on delete set null,
  client_id   uuid references public.clients (id) on delete set null,
  title       text,
  created_at  timestamptz not null default now()
);
create index chat_sessions_user_id_idx on public.chat_sessions (user_id);

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.chat_sessions (id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,                            -- 마크다운
  citations   jsonb,                                    -- [{type, id, title, score}]
  feedback    text check (feedback in ('helpful', 'insufficient', 'wrong')),
  created_at  timestamptz not null default now()
);
create index chat_messages_session_id_idx on public.chat_messages (session_id);

create table public.retrievals (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.chat_messages (id) on delete cascade,
  query_text  text not null,
  results     jsonb,                                    -- 후보 + 유사도 점수
  grounded    boolean,                                  -- 임계치 이상 근거 확보 여부
  created_at  timestamptz not null default now()
);
create index retrievals_message_id_idx on public.retrievals (message_id);
