-- channels: 문의 수집 채널 관리 테이블
-- key 는 inquiries.source 와 매칭되는 식별자.
create table public.channels (
  id         serial primary key,
  key        text not null unique,
  label      text not null,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

alter table public.channels enable row level security;

create policy channels_select on public.channels
  for select to authenticated using (true);

create policy channels_insert on public.channels
  for insert to authenticated with check (public.can_edit());

create policy channels_delete on public.channels
  for delete to authenticated using (public.is_lead());

-- 기본 채널
insert into public.channels (key, label, sort_order) values
  ('manual',      '직접입력',      1),
  ('phone',       '전화',          2),
  ('email',       'Gmail',         3),
  ('kakao',       '카카오',        4),
  ('sms',         'SMS',           5),
  ('google_form', 'Google Forms',  6),
  ('slack',       'Slack',         7),
  ('csv_import',  'CSV',           8),
  ('wiki_import', '위키',          9)
on conflict (key) do nothing;
