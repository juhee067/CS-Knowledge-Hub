-- ============================================================================
-- Sprint 4: 자동 분류 & 지식 자산화 (FR-4, FR-5)
--   - match_faqs RPC        : 임베딩 유사도 기반 유사 FAQ Top-N
--   - assetize_candidates    : 빈출 미해결 문의 랭킹 뷰 (자산화 큐)
--   - classification_feedback: 담당자 분류 수정 피드백 적립
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 유사 FAQ Top-N (임베딩 코사인 유사도)
--    classify-inquiry Edge Function 이 임베딩을 만들어 호출.
--    deprecated 는 제외, 삭제된 FAQ 제외.
-- ----------------------------------------------------------------------------
create or replace function public.match_faqs(
  p_embedding vector(1536),
  p_limit     int  default 5,
  p_client_id uuid default null
)
returns table (
  id          uuid,
  question    text,
  answer      text,
  category    text,
  tags        text[],
  status      text,
  similarity  double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    f.id,
    f.question,
    f.answer,
    f.category,
    f.tags,
    f.status,
    1 - (f.embedding <=> p_embedding) as similarity
  from public.faqs f
  where f.deleted_at is null
    and f.embedding is not null
    and f.status <> 'deprecated'
  order by f.embedding <=> p_embedding
  limit greatest(p_limit, 1);
$$;

-- ----------------------------------------------------------------------------
-- 2) 자산화 큐 — 빈출 미해결 문의 랭킹 (FR-5.3)
--    추정 카테고리(없으면 '미분류') 기준으로 open 문의를 묶어 빈도순 정렬.
--    "반복 문의 N회 자동 큐 등록"은 프론트에서 cnt >= 임계치 필터로 적용.
-- ----------------------------------------------------------------------------
create or replace view public.assetize_candidates as
select
  coalesce(predicted_category, '미분류')          as category,
  count(*)                                          as open_count,
  round(avg(coalesce(prediction_score, 0))::numeric, 3) as avg_score,
  min(created_at)                                   as first_seen,
  max(created_at)                                   as last_seen,
  (array_agg(id order by created_at desc))[1]       as latest_inquiry_id,
  (array_agg(left(raw_text, 140) order by created_at desc))[1] as sample_text
from public.inquiries
where status = 'open'
group by coalesce(predicted_category, '미분류')
order by open_count desc, last_seen desc;

-- 뷰는 기반 테이블(inquiries) RLS 를 상속 → authenticated 전원 조회 가능.

-- ----------------------------------------------------------------------------
-- 3) 분류 피드백 적립 (FR-4.3)
--    담당자가 추정 카테고리/클라이언트를 수정·확정한 기록.
--    향후 분류 정확도 개선·재학습 신호로 활용.
-- ----------------------------------------------------------------------------
create table if not exists public.classification_feedback (
  id                   uuid primary key default gen_random_uuid(),
  inquiry_id           uuid references public.inquiries (id) on delete cascade,
  predicted_category   text,
  corrected_category   text,
  predicted_client_id  uuid references public.clients (id) on delete set null,
  corrected_client_id  uuid references public.clients (id) on delete set null,
  prediction_score     real,
  accepted             boolean not null default false,  -- 추정 그대로 수용 여부
  actor_id             uuid references public.users (id) on delete set null,
  created_at           timestamptz not null default now()
);
create index classification_feedback_inquiry_idx
  on public.classification_feedback (inquiry_id);

alter table public.classification_feedback enable row level security;

-- editor+ 가 본인 행위로 기록, 전원 조회.
create policy classification_feedback_select on public.classification_feedback
  for select to authenticated using (true);
create policy classification_feedback_insert on public.classification_feedback
  for insert to authenticated
  with check (public.can_edit() and actor_id = auth.uid());
