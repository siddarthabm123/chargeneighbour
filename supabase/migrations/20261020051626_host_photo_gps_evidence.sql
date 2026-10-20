-- Photo bytes remain in a private Storage bucket; only server-validated metadata is writable.
do $$ begin
 if to_regclass('storage.buckets') is not null then
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('chargeneighbour-host-proof','chargeneighbour-host-proof',false,3000000,array['image/jpeg']) on conflict(id) do nothing;
 end if;
end $$;
create table public.host_evidence (
 id uuid primary key,
 user_id uuid not null,
 object_path text not null unique check(object_path like user_id::text||'/%'),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 accuracy_m double precision not null check(accuracy_m between 0 and 100),
 captured_at timestamptz not null,
 created_at timestamptz not null default now(),
 consent boolean not null check(consent),
 byte_count integer not null check(byte_count between 1 and 3000000)
);
alter table public.host_evidence enable row level security;
revoke all on public.host_evidence from public,anon,authenticated;
grant select on public.host_evidence to authenticated;
grant select,insert,delete on public.host_evidence to service_role;
create policy host_evidence_owner_read on public.host_evidence for select to authenticated using(user_id=(select auth.uid()));
create index host_evidence_created on public.host_evidence(created_at);
create function public.require_host_evidence() returns trigger language plpgsql security invoker set search_path='' as $$
declare evidence public.host_evidence;
begin
 if new.kind<>'host' then return new; end if;
 if coalesce(new.payload->>'evidenceId','') !~ '^[0-9a-f-]{36}$' then raise exception 'A charger photo and fresh on-site GPS capture are required' using errcode='23514'; end if;
 select * into evidence from public.host_evidence where id=(new.payload->>'evidenceId')::uuid and new.user_id='supabase:'||user_id::text;
 if not found or evidence.created_at<clock_timestamp()-interval '30 minutes' or evidence.captured_at<evidence.created_at-interval '2 minutes' or evidence.captured_at>evidence.created_at+interval '1 minute' then
  raise exception 'A fresh, owned charger photo and GPS capture are required' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function public.require_host_evidence() from public,anon,authenticated;
create trigger zz_host_evidence_guard before insert on public.marketplace_requests for each row execute function public.require_host_evidence();
create unique index host_evidence_one_application on public.marketplace_requests((payload->>'evidenceId')) where kind='host' and payload ? 'evidenceId';
comment on table public.host_evidence is 'Private, self-reported photo/GPS evidence for manual review. GPS does not prove charger existence or electrical safety.';

alter function public.export_pilot_snapshot() rename to export_pilot_snapshot_v1;
create function public.export_pilot_snapshot() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 result:=jsonb_set(public.export_pilot_snapshot_v1(),'{tables,host_evidence}',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.host_evidence r));
 if octet_length(result::text)>2000000 then raise exception 'Pilot snapshot exceeds export limit. Use managed database backups.'; end if;
 return result;
end $$;
revoke all on function public.export_pilot_snapshot() from public,anon,authenticated;
grant execute on function public.export_pilot_snapshot() to service_role;
