-- search_knowledge 반환 타입 불일치(42804) 수정.
-- RRF 점수의 1.0 리터럴이 numeric 으로 평가되어 함수 선언(double precision)과 불일치 →
-- 1.0::float8 로 캐스팅해 double precision 으로 통일.
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
  rrf as (
    select
      coalesce(ft.id, vt.id) as id,
      coalesce(1.0::float8 / (p_rrf_k + ft.rank), 0) as fts_score,
      coalesce(1.0::float8 / (p_rrf_k + vt.rank), 0) as vec_score
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
    r.fts_score::double precision,
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
