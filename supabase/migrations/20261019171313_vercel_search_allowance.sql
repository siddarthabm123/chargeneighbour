create table if not exists public.api_search_quota (
 day date primary key,
 count integer not null check (count between 0 and 100)
);
alter table public.api_search_quota enable row level security;
revoke all on public.api_search_quota from anon, authenticated;
grant select, insert, update on public.api_search_quota to service_role;
create or replace function public.consume_search_allowance()
returns boolean language plpgsql security invoker set search_path = '' as $$
declare used integer;
begin
 insert into public.api_search_quota(day,count)
 values ((now() at time zone 'UTC')::date,1)
 on conflict(day) do update set count=public.api_search_quota.count+1
 where public.api_search_quota.count<100 returning count into used;
 return used is not null;
end;
$$;
revoke all on function public.consume_search_allowance() from public, anon, authenticated;
grant execute on function public.consume_search_allowance() to service_role;
