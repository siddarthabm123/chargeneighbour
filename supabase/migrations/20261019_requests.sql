create table if not exists public.marketplace_requests (
 id uuid primary key,
 user_id text not null,
 email text not null,
 kind text not null check (kind in ('host','interest')),
 payload jsonb not null,
 status text not null check (status in ('pending_review','registered','cancelled')),
 created_at timestamptz not null default now()
);
create index if not exists marketplace_requests_owner_created on public.marketplace_requests (user_id,created_at desc);
alter table public.marketplace_requests enable row level security;
revoke all on public.marketplace_requests from anon,authenticated;
grant select,insert,update on public.marketplace_requests to service_role;
comment on table public.marketplace_requests is 'Account-scoped host applications and pilot interest. Access only through the authenticated ChargeNeighbour server; no public listing or commercial booking approval.';
