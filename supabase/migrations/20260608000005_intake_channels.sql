-- ============================================================================
-- Sprint 3: 자동 수집 커넥터 지원 — connector_logs + 채널 통계 뷰
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 커넥터 처리 로그 (오류 추적·알림용)
-- ----------------------------------------------------------------------------
create table if not exists public.connector_logs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,          -- 'google_form' | 'email' | 'slack' | 'kakao' | 'sms' | 'manual'
  event_ref   text,                   -- 외부 이벤트 ID (dedup 보조)
  status      text not null default 'ok'
                check (status in ('ok', 'error', 'duplicate')),
  error_msg   text,
  payload     jsonb,                  -- 원본 웹훅 페이로드 (디버깅용)
  created_at  timestamptz not null default now()
);

create index connector_logs_source_idx      on public.connector_logs (source);
create index connector_logs_status_idx      on public.connector_logs (status);
create index connector_logs_created_at_idx  on public.connector_logs (created_at desc);

-- RLS: lead만 조회 (민감한 원본 페이로드 포함)
alter table public.connector_logs enable row level security;
create policy connector_logs_select_lead on public.connector_logs
  for select to authenticated using (public.is_lead());

-- ----------------------------------------------------------------------------
-- 2) 채널별 일일 통계 뷰 (대시보드용)
-- ----------------------------------------------------------------------------
create or replace view public.channel_daily_stats as
select
  source,
  date_trunc('day', created_at) as day,
  count(*)                       as total,
  count(*) filter (where status = 'open')       as open_count,
  count(*) filter (where status = 'answered')   as answered_count,
  count(*) filter (where status = 'assetized')  as assetized_count
from public.inquiries
group by source, date_trunc('day', created_at)
order by day desc, total desc;

-- RLS는 뷰 정의의 기반 테이블(inquiries) 정책을 따른다.
-- authenticated 사용자는 모두 조회 가능 (inquiries_select 정책 상속).

-- ----------------------------------------------------------------------------
-- 3) 채널별 누적 요약 뷰 (대시보드 카드용)
-- ----------------------------------------------------------------------------
create or replace view public.channel_summary as
select
  source,
  count(*)                       as total,
  count(*) filter (where status = 'open')      as open_count,
  round(
    count(*) filter (where status = 'open')::numeric
    / nullif(count(*), 0) * 100,
    1
  )                              as open_rate,
  max(created_at)                as last_received_at,
  (
    select count(*)
    from public.connector_logs cl
    where cl.source = i.source
      and cl.status = 'error'
      and cl.created_at > now() - interval '24 hours'
  )                              as errors_24h
from public.inquiries i
group by source;

-- ----------------------------------------------------------------------------
-- 4) Gmail 7일 갱신 추적 테이블
-- ----------------------------------------------------------------------------
create table if not exists public.gmail_watch (
  id              uuid primary key default gen_random_uuid(),
  user_email      text not null unique,
  history_id      text,
  expiration_ms   bigint,         -- Gmail Watch 만료시각 (epoch ms)
  refreshed_at    timestamptz not null default now()
);

alter table public.gmail_watch enable row level security;
create policy gmail_watch_lead on public.gmail_watch
  for all to authenticated using (public.is_lead());
