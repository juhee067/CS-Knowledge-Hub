-- ============================================================================
-- Sprint 2: 통합 검색 — FTS + pgvector 하이브리드 (FR-1)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) FTS 컬럼 & 인덱스
--    question + answer 를 한국어/영어 모두 커버하도록 simple 설정 사용
-- ----------------------------------------------------------------------------
alter table public.faqs
  add column if not exists fts tsvector
    generated always as (
      to_tsvector('simple', coalesce(question, '') || ' ' || coalesce(answer, ''))
    ) stored;

create index if not exists faqs_fts_idx on public.faqs using gin (fts);

-- pgvector HNSW 인덱스 (코사인 유사도)
create index if not exists faqs_embedding_idx
  on public.faqs using hnsw (embedding vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- 2) search_knowledge RPC — FTS + 벡터 하이브리드 (RRF 방식)
--    입력: 쿼리 텍스트 + 선택적 임베딩 벡터 + 필터 파라미터
--    출력: FAQ 결과 + 연결 클라이언트 설정 카드
-- ----------------------------------------------------------------------------
create or replace function public.search_knowledge(
  p_query       text,
  p_embedding   vector(1536) default null,
  p_client_id   uuid         default null,
  p_category    text         default null,
  p_status      text         default 'verified',
  p_limit       int          default 20,
  p_rrf_k       int          default 60
)
returns table (
  id            uuid,
  question      text,
  answer        text,
  category      text,
  tags          text[],
  status        text,
  updated_at    timestamptz,
  fts_rank      double precision,
  vec_rank      double precision,
  rrf_score     double precision,
  client_configs jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with
  -- FTS 후보 (삭제되지 않은 FAQ)
  fts_results as (
    select
      f.id,
      row_number() over (
        order by ts_rank_cd(f.fts, plainto_tsquery('simple', p_query)) desc
      ) as rank
    from public.faqs f
    where f.deleted_at is null
      and (p_status = 'all' or f.status = p_status)
      and (p_category is null or f.category = p_category)
      and f.fts @@ plainto_tsquery('simple', p_query)
    order by rank
    limit 100
  ),
  -- 벡터 후보 (임베딩이 있을 때만)
  vec_results as (
    select
      f.id,
      row_number() over (
        order by f.embedding <=> p_embedding
      ) as rank
    from public.faqs f
    where p_embedding is not null
      and f.embedding is not null
      and f.deleted_at is null
      and (p_status = 'all' or f.status = p_status)
      and (p_category is null or f.category = p_category)
    order by f.embedding <=> p_embedding
    limit 100
  ),
  -- RRF 합산
  rrf as (
    select
      coalesce(ft.id, vt.id) as id,
      coalesce(1.0 / (p_rrf_k + ft.rank), 0) as fts_score,
      coalesce(1.0 / (p_rrf_k + vt.rank), 0) as vec_score
    from fts_results ft
    full outer join vec_results vt on ft.id = vt.id
  ),
  ranked as (
    select
      r.id,
      r.fts_score,
      r.vec_score,
      r.fts_score + r.vec_score as score
    from rrf r
    order by score desc
    limit p_limit
  )
  select
    f.id,
    f.question,
    f.answer,
    f.category,
    f.tags,
    f.status,
    f.updated_at,
    r.fts_score,
    r.vec_score,
    r.score,
    -- 연결된 클라이언트 설정 카드 (p_client_id 또는 전체)
    coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'id',        cc.id,
          'client_id', cc.client_id,
          'title',     cc.title,
          'body',      cc.body,
          'rule_type', cc.rule_type,
          'severity',  cc.severity,
          'applies_to',cc.applies_to
        ) order by cc.severity desc)
        from public.client_configs cc
        join public.clients cl on cl.id = cc.client_id
        where (
          cc.applies_to is null
          or f.category ilike '%' || cc.applies_to || '%'
          or f.question  ilike '%' || cc.applies_to || '%'
        )
        and (p_client_id is null or cc.client_id = p_client_id)
      ),
      '[]'::jsonb
    ) as client_configs
  from ranked r
  join public.faqs f on f.id = r.id
  order by r.score desc;
end;
$$;

-- ----------------------------------------------------------------------------
-- 3) FAQ embed 트리거 요청 테이블 (Edge Function 비동기 호출 큐)
--    embed-faq Edge Function 이 이 테이블을 폴링하여 임베딩 생성
-- ----------------------------------------------------------------------------
create table if not exists public.embed_queue (
  id         uuid primary key default gen_random_uuid(),
  faq_id     uuid not null references public.faqs (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (faq_id)
);

-- FAQ insert / 의미 있는 update 시 큐에 추가
create or replace function public.faq_enqueue_embed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.embed_queue (faq_id) values (new.id)
  on conflict (faq_id) do update set created_at = now();
  return new;
end;
$$;

drop trigger if exists faqs_enqueue_embed_insert on public.faqs;
create trigger faqs_enqueue_embed_insert
  after insert on public.faqs
  for each row execute function public.faq_enqueue_embed();

drop trigger if exists faqs_enqueue_embed_update on public.faqs;
create trigger faqs_enqueue_embed_update
  after update of question, answer on public.faqs
  for each row
  when (old.question is distinct from new.question
        or old.answer is distinct from new.answer)
  execute function public.faq_enqueue_embed();
