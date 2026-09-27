-- ============================================================================
-- 통합 검색 개선 — 한국어 recall 보강 + 하이브리드(FTS + ILIKE + 벡터) RRF
--
-- 문제:
--  1) 'simple' tsconfig 는 형태소 분석이 없어 한국어 조사/어미 변형을 못 잡음
--     ("환불" 검색이 "환불은/환불을/환불정책" 을 놓침)
--  2) p_embedding 이 null 이면 벡터 분기가 비어 사실상 FTS 단독
--
-- 해법:
--  - 쿼리를 토큰별 접두(prefix) tsquery 로 변환 → "환불:*" 가 "환불은/환불을" 매칭
--  - ILIKE 부분매칭 분기 추가 → 접두로도 못 잡는 중간 부분 문자열("정책"→"환불정책")
--  - 벡터 분기는 그대로(임베딩 있을 때만) — 셋을 RRF 로 합산
-- ============================================================================
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
declare
  v_q     text := lower(trim(coalesce(p_query, '')));
  v_terms text;
  v_tsq   tsquery;
begin
  -- 토큰별 접두 tsquery 문자열 만들기: "환불 정책" -> "환불:* | 정책:*"
  --  · 각 토큰에서 tsquery 특수문자 제거(영숫자/한글만 유지)
  --  · OR(|) 결합으로 recall 우선
  select nullif(string_agg(term || ':*', ' | '), '')
    into v_terms
  from (
    select regexp_replace(tok, '[^[:alnum:]가-힣]', '', 'g') as term
    from unnest(regexp_split_to_array(v_q, '\s+')) as tok
  ) s
  where term <> '';

  -- 접두 tsquery 생성 (실패 시 기본 plainto 로 폴백)
  begin
    v_tsq := to_tsquery('simple', coalesce(v_terms, ''));
  exception when others then
    v_tsq := plainto_tsquery('simple', v_q);
  end;
  if v_tsq is null then
    v_tsq := plainto_tsquery('simple', v_q);
  end if;

  return query
  with
  -- 1) FTS (접두 매칭)
  fts_results as (
    select
      f.id,
      row_number() over (order by ts_rank_cd(f.fts, v_tsq) desc) as rank
    from public.faqs f
    where f.deleted_at is null
      and (p_status = 'all' or f.status = p_status)
      and (p_category is null or f.category = p_category)
      and f.fts @@ v_tsq
    limit 100
  ),
  -- 2) ILIKE 부분 매칭 (FTS 접두가 놓치는 중간 부분 문자열)
  like_results as (
    select
      f.id,
      row_number() over (order by f.updated_at desc) as rank
    from public.faqs f
    where v_q <> ''
      and f.deleted_at is null
      and (p_status = 'all' or f.status = p_status)
      and (p_category is null or f.category = p_category)
      and (f.question ilike '%' || p_query || '%' or f.answer ilike '%' || p_query || '%')
    limit 100
  ),
  -- 3) 벡터 (임베딩이 있을 때만)
  vec_results as (
    select
      f.id,
      row_number() over (order by f.embedding <=> p_embedding) as rank
    from public.faqs f
    where p_embedding is not null
      and f.embedding is not null
      and f.deleted_at is null
      and (p_status = 'all' or f.status = p_status)
      and (p_category is null or f.category = p_category)
    order by f.embedding <=> p_embedding
    limit 100
  ),
  ids as (
    select id from fts_results
    union select id from like_results
    union select id from vec_results
  ),
  rrf as (
    select
      i.id,
      coalesce(1.0::float8 / (p_rrf_k + ft.rank), 0) as fts_score,
      coalesce(1.0::float8 / (p_rrf_k + lk.rank), 0) as like_score,
      coalesce(1.0::float8 / (p_rrf_k + vt.rank), 0) as vec_score
    from ids i
    left join fts_results  ft on ft.id = i.id
    left join like_results lk on lk.id = i.id
    left join vec_results  vt on vt.id = i.id
  ),
  ranked as (
    select
      r.id,
      -- 어휘 점수(FTS + ILIKE) 와 벡터 점수
      (r.fts_score + r.like_score * 0.5) as lexical_score,
      r.vec_score,
      (r.fts_score + r.like_score * 0.5 + r.vec_score) as score
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
    r.lexical_score::double precision,
    r.vec_score::double precision,
    r.score::double precision,
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
