-- ============================================================================
-- FAQ 클라이언트 연결: faqs.client_id 추가
--   - 어떤 고객사용 FAQ인지 분류 (선택, 미지정 가능)
--   - 클라이언트 삭제 시 FAQ는 유지하고 연결만 해제 (set null)
-- ============================================================================
alter table public.faqs
  add column if not exists client_id uuid references public.clients (id) on delete set null;

create index if not exists faqs_client_idx
  on public.faqs (client_id) where deleted_at is null;
