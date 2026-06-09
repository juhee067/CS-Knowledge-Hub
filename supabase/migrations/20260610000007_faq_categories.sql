-- faq_categories: 카테고리 관리 테이블
create table public.faq_categories (
  id         serial primary key,
  name       text not null unique,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.faq_categories enable row level security;

create policy faq_categories_select on public.faq_categories
  for select to authenticated using (true);

create policy faq_categories_insert on public.faq_categories
  for insert to authenticated with check (public.can_edit());

create policy faq_categories_delete on public.faq_categories
  for delete to authenticated using (public.is_lead());

-- 기본 카테고리
insert into public.faq_categories (name, sort_order) values
  ('기본가이드',  1),
  ('플랜/크레딧', 2),
  ('채널관리',    3),
  ('AI설정',      4),
  ('학습/RAG',    5),
  ('운영/멤버',   6)
on conflict (name) do nothing;
