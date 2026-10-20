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

begin;

-- Atomic, bounded shared quotas. No IP addresses are stored, only daily HMACs.
create table public.request_allowances (
 bucket text primary key check (length(bucket) between 1 and 180),
 window_start timestamptz not null,
 count integer not null check (count > 0),
 expires_at timestamptz not null
);
alter table public.request_allowances enable row level security;
revoke all on public.request_allowances from anon, authenticated;
grant select, insert, update, delete on public.request_allowances to service_role;
create index request_allowances_expiry on public.request_allowances(expires_at);
create function public.take_allowance(p_bucket text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare accepted integer; stamp timestamptz := clock_timestamp();
begin
 if p_limit not between 1 and 100000 or p_seconds not between 1 and 86400 then raise exception 'Invalid allowance'; end if;
 insert into public.request_allowances(bucket,window_start,count,expires_at)
 values(p_bucket,stamp,1,stamp+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set
 count=case when request_allowances.expires_at<=stamp then 1 else request_allowances.count+1 end,
 window_start=case when request_allowances.expires_at<=stamp then stamp else request_allowances.window_start end,
 expires_at=case when request_allowances.expires_at<=stamp then stamp+make_interval(secs=>p_seconds) else request_allowances.expires_at end
 where request_allowances.expires_at<=stamp or request_allowances.count<p_limit
 returning count into accepted;
 return accepted is not null;
end $$;
revoke all on function public.take_allowance(text,integer,integer) from public,anon,authenticated;
grant execute on function public.take_allowance(text,integer,integer) to service_role;

alter table public.marketplace_requests drop constraint marketplace_requests_kind_check;
alter table public.marketplace_requests add constraint marketplace_requests_kind_check check(kind in ('host','interest','support','deletion'));
alter table public.marketplace_requests add column idempotency_key uuid;
alter table public.marketplace_requests add column operator_reply text check(length(operator_reply)<=4000);
alter table public.marketplace_requests add column reviewed_at timestamptz;
alter table public.marketplace_requests add column metric_counted boolean not null default false;
alter table public.marketplace_requests add column withdrawn_at timestamptz;
update public.marketplace_requests set withdrawn_at=now() where status='cancelled';
create unique index marketplace_request_idempotency on public.marketplace_requests(user_id,idempotency_key) where idempotency_key is not null;
grant select,insert on public.marketplace_requests to authenticated;
grant update(status) on public.marketplace_requests to authenticated;
create policy request_owner_read on public.marketplace_requests for select to authenticated
 using(user_id='supabase:'||(select auth.uid())::text);
create policy request_owner_create on public.marketplace_requests for insert to authenticated
 with check(user_id='supabase:'||(select auth.uid())::text and status=case when kind in ('host','support','deletion') then 'pending_review' else 'registered' end);
create policy request_owner_withdraw on public.marketplace_requests for update to authenticated
 using(user_id='supabase:'||(select auth.uid())::text)
 with check(user_id='supabase:'||(select auth.uid())::text and status='cancelled');

create function public.guard_marketplace_request() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if octet_length(new.payload::text)>6000 then raise exception 'Request payload too large'; end if;
 perform pg_advisory_xact_lock(hashtextextended(new.user_id||':'||new.kind,0));
 if exists(select 1 from public.marketplace_requests where user_id=new.user_id and kind=new.kind and created_at>clock_timestamp()-interval '10 seconds') then
  raise exception 'Please wait before submitting again' using errcode='P0001';
 end if;
 new.created_at:=clock_timestamp();
 if auth.uid() is not null then
  if new.user_id<>'supabase:'||auth.uid()::text then raise insufficient_privilege; end if;
  new.email:=auth.jwt()->>'email'; new.operator_reply:=null; new.reviewed_at:=null;new.metric_counted:=false;
 end if;
 new.status:=case when new.kind in ('host','support','deletion') then 'pending_review' else 'registered' end;
 return new;
end $$;
create trigger marketplace_request_guard before insert on public.marketplace_requests for each row execute function public.guard_marketplace_request();
revoke all on function public.guard_marketplace_request() from public,anon,authenticated;
create function public.stamp_withdrawal() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status='cancelled' and old.status<>'cancelled' then new.withdrawn_at:=clock_timestamp(); end if;
 return new;
end $$;
revoke all on function public.stamp_withdrawal() from public,anon,authenticated;
create trigger marketplace_withdrawal before update of status on public.marketplace_requests for each row execute function public.stamp_withdrawal();
create function public.submit_marketplace_request(p_kind text,p_payload jsonb,p_key uuid)
returns public.marketplace_requests language plpgsql security invoker set search_path='' as $$
declare owner_key text := 'supabase:'||auth.uid()::text; result public.marketplace_requests;
begin
 if auth.uid() is null or p_key is null or p_kind not in ('host','interest','support','deletion') or octet_length(p_payload::text)>6000 then raise insufficient_privilege; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_key||':'||p_kind,0));
 select * into result from public.marketplace_requests where user_id=owner_key and idempotency_key=p_key;
 if found then
  if result.kind<>p_kind or result.payload<>p_payload then raise exception 'Idempotency conflict'; end if;
  return result;
 end if;
 insert into public.marketplace_requests(id,user_id,email,kind,payload,status,idempotency_key)
 values(gen_random_uuid(),owner_key,auth.jwt()->>'email',p_kind,p_payload,case when p_kind in ('host','support','deletion') then 'pending_review' else 'registered' end,p_key)
 returning * into result;
 return result;
end $$;
revoke all on function public.submit_marketplace_request(text,jsonb,uuid) from public,anon;
grant execute on function public.submit_marketplace_request(text,jsonb,uuid) to authenticated;

-- Campaign counts contain only allow-listed labels, never user IDs or GPS.
create table public.funnel_daily (
 day date not null default (now() at time zone 'utc')::date,
 event text not null check(event in ('visit','signin','host_application','interest','support','reservation','session_completed')),
 source text not null check(source ~ '^[a-z0-9_-]{1,64}$'),
 count integer not null default 1 check(count>0),
 primary key(day,event,source)
);
alter table public.funnel_daily enable row level security;
revoke all on public.funnel_daily from anon,authenticated;
grant select,insert,update,delete on public.funnel_daily to service_role;
create function public.count_funnel(p_event text,p_source text) returns void
language sql security invoker set search_path='' as $$
 insert into public.funnel_daily(event,source) values(p_event,p_source)
 on conflict(day,event,source) do update set count=funnel_daily.count+1;
$$;
revoke all on function public.count_funnel(text,text) from public,anon,authenticated;
grant execute on function public.count_funnel(text,text) to service_role;
create function public.count_saved_application(p_id uuid,p_source text) returns void
language plpgsql security invoker set search_path='' as $$
declare saved_kind text;
begin
 update public.marketplace_requests set metric_counted=true where id=p_id and not metric_counted and kind in ('host','interest') returning kind into saved_kind;
 if saved_kind is not null then perform public.count_funnel(case when saved_kind='host' then 'host_application' else 'interest' end,p_source); end if;
end $$;
revoke all on function public.count_saved_application(uuid,text) from public,anon,authenticated;
grant execute on function public.count_saved_application(uuid,text) to service_role;

-- Exact residential address is kept apart from the public listing.
create table public.host_chargers (
 id uuid primary key default gen_random_uuid(),
 owner_id text not null,
 application_id uuid references public.marketplace_requests(id),
 name text not null check(length(name) between 2 and 100),
 area text not null check(length(area) between 2 and 120),
 latitude numeric(5,2) not null check(latitude between -90 and 90),
 longitude numeric(6,2) not null check(longitude between -180 and 180),
 power_kw numeric(4,1) not null check(power_kw in (3.3,7.2,11,22)),
 price_paise_kwh integer not null check(price_paise_kwh between 100 and 10000),
 access_notes text not null check(length(access_notes) between 10 and 2000),
 photos jsonb not null default '[]'::jsonb check(jsonb_typeof(photos)='array' and jsonb_array_length(photos)<=6),
 checks jsonb not null default '{}'::jsonb,
 status text not null default 'draft' check(status in ('draft','approved','paused')),
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 check(status<>'approved' or (verified_at is not null and checks @> '{"identity":true,"permission":true,"electrical":true,"metering":true,"access":true,"support":true}'::jsonb))
);
create table public.host_locations (
 charger_id uuid primary key references public.host_chargers(id),
 address text not null check(length(address) between 10 and 1000),
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180)
);
create table public.host_slots (
 id uuid primary key default gen_random_uuid(),
 charger_id uuid not null references public.host_chargers(id),
 starts_at timestamptz not null,
 ends_at timestamptz not null check(ends_at>starts_at),
 check(ends_at-starts_at<=interval '12 hours'),
 unique(charger_id,starts_at,ends_at)
);
create index host_slots_lookup on public.host_slots(charger_id,starts_at);
create index host_chargers_owner on public.host_chargers(owner_id);
create unique index host_chargers_application on public.host_chargers(application_id);
create index host_chargers_approved on public.host_chargers(created_at desc) where status='approved';
alter table public.host_chargers enable row level security;
alter table public.host_locations enable row level security;
alter table public.host_slots enable row level security;
revoke all on public.host_chargers,public.host_locations,public.host_slots from anon,authenticated;
grant select,insert,update,delete on public.host_chargers,public.host_locations,public.host_slots to service_role;
grant select on public.host_chargers to authenticated;
create policy host_own_listings on public.host_chargers for select to authenticated using(owner_id='supabase:'||(select auth.uid())::text);

create table public.reservations (
 id uuid primary key default gen_random_uuid(),
 charger_id uuid not null references public.host_chargers(id),
 driver_id text not null,
 idempotency_key uuid not null,
 starts_at timestamptz not null,
 ends_at timestamptz not null check(ends_at>starts_at),
 status text not null default 'requested' check(status in ('requested','confirmed','in_progress','completed','cancelled','expired')),
 hold_until timestamptz not null default now()+interval '30 minutes',
 rate_paise_kwh integer not null check(rate_paise_kwh>0),
 start_meter numeric(12,3), end_meter numeric(12,3), energy_kwh numeric(9,3),
 amount_paise integer check(amount_paise>=0), commission_paise integer check(commission_paise>=0),
 payment_status text not null default 'unpaid' check(payment_status in ('unpaid','creating','pending','paid','refund_requested','refunded')),
 order_id text unique, payment_id text unique, payment_attempt uuid,
 created_at timestamptz not null default now(),
 unique(driver_id,idempotency_key),
 check(ends_at-starts_at between interval '30 minutes' and interval '6 hours')
);
create index reservations_charger_time on public.reservations(charger_id,starts_at,ends_at);
create index reservations_driver on public.reservations(driver_id,created_at desc);
create table public.operation_events (
 id uuid primary key default gen_random_uuid(), actor text not null,
 action text not null, reference_id uuid, note text not null default '' check(length(note)<=4000),
 created_at timestamptz not null default now()
);
create index operation_events_created on public.operation_events(created_at desc);
create table public.payment_events (
 id text primary key, booking_id uuid not null references public.reservations(id),
 payment_id text not null, event text not null, amount_paise integer not null,
 created_at timestamptz not null default now()
);
create index payment_events_booking on public.payment_events(booking_id);
create table public.session_ledger (
 booking_id uuid primary key references public.reservations(id),
 gross_paise integer not null, commission_paise integer not null, host_paise integer not null,
 settlement_status text not null default 'pending' check(settlement_status in ('pending','settled','refunded')),
 settlement_reference text, created_at timestamptz not null default now(),
 check(gross_paise=commission_paise+host_paise)
);
alter table public.reservations enable row level security;
alter table public.operation_events enable row level security;
alter table public.payment_events enable row level security;
alter table public.session_ledger enable row level security;
revoke all on public.reservations,public.operation_events,public.payment_events,public.session_ledger from anon,authenticated;
grant select,insert,update,delete on public.reservations,public.operation_events,public.payment_events,public.session_ledger to service_role;
grant select on public.reservations to authenticated;
create policy reservation_participant_read on public.reservations for select to authenticated using(
 driver_id='supabase:'||(select auth.uid())::text or exists(select 1 from public.host_chargers c where c.id=charger_id and c.owner_id='supabase:'||(select auth.uid())::text)
);

-- Every reservation creation locks its charger row. Overlap check and insert are one transaction.
create function public.reserve_host(p_driver text,p_charger uuid,p_start timestamptz,p_end timestamptz,p_key uuid)
returns public.reservations language plpgsql security invoker set search_path='' as $$
declare charger public.host_chargers; result public.reservations;
begin
 select * into charger from public.host_chargers where id=p_charger for update;
 if not found or charger.status<>'approved' or charger.owner_id=p_driver then raise exception 'Charger unavailable'; end if;
 select * into result from public.reservations where driver_id=p_driver and idempotency_key=p_key;
 if found then
  if result.charger_id<>p_charger or result.starts_at<>p_start or result.ends_at<>p_end then raise exception 'Idempotency conflict'; end if;
  return result;
 end if;
 if p_start<clock_timestamp()+interval '1 hour' or p_start>clock_timestamp()+interval '30 days' or p_end-p_start not between interval '30 minutes' and interval '6 hours' then raise exception 'Invalid booking interval'; end if;
 if not exists(select 1 from public.host_slots where charger_id=p_charger and starts_at<=p_start and ends_at>=p_end) then raise exception 'Outside offered hours'; end if;
 update public.reservations set status='expired' where charger_id=p_charger and status='requested' and hold_until<clock_timestamp();
 if exists(select 1 from public.reservations where charger_id=p_charger and status in ('requested','confirmed','in_progress') and starts_at<p_end and ends_at>p_start) then raise exception 'Time unavailable' using errcode='23P01'; end if;
 insert into public.reservations(charger_id,driver_id,idempotency_key,starts_at,ends_at,rate_paise_kwh)
 values(p_charger,p_driver,p_key,p_start,p_end,charger.price_paise_kwh) returning * into result;
 insert into public.operation_events(actor,action,reference_id) values(p_driver,'reservation.requested',result.id);
 return result;
end $$;
revoke all on function public.reserve_host(text,uuid,timestamptz,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.reserve_host(text,uuid,timestamptz,timestamptz,uuid) to service_role;

create function public.operate_reservation(p_id uuid,p_actor text,p_action text,p_meter numeric default null,p_note text default '')
returns public.reservations language plpgsql security invoker set search_path='' as $$
declare result public.reservations; charger uuid;
begin
 select charger_id into charger from public.reservations where id=p_id;
 perform 1 from public.host_chargers where id=charger for update;
 select * into result from public.reservations where id=p_id for update;
 if not found then raise exception 'Booking not found'; end if;
 if p_action='confirm' and result.status='requested' and result.hold_until>clock_timestamp() then result.status:='confirmed';
 elsif p_action='start' and result.status='confirmed' and p_meter>=0 and clock_timestamp() between result.starts_at-interval '15 minutes' and result.ends_at then result.status:='in_progress'; result.start_meter:=p_meter;
 elsif p_action='finish' and result.status='in_progress' and p_meter>result.start_meter and p_meter-result.start_meter<=200 then
  result.status:='completed'; result.end_meter:=p_meter; result.energy_kwh:=p_meter-result.start_meter;
  result.amount_paise:=round(result.energy_kwh*result.rate_paise_kwh); result.commission_paise:=round(result.amount_paise*0.15);
 elsif p_action='cancel' and result.status in ('requested','confirmed') then result.status:='cancelled';
 elsif p_action='refund_request' and result.payment_status='paid' then result.payment_status:='refund_requested';
 else raise exception 'Invalid session transition'; end if;
 update public.reservations set status=result.status,start_meter=result.start_meter,end_meter=result.end_meter,energy_kwh=result.energy_kwh,amount_paise=result.amount_paise,commission_paise=result.commission_paise,payment_status=result.payment_status where id=p_id;
 insert into public.operation_events(actor,action,reference_id,note) values(p_actor,'reservation.'||p_action,p_id,p_note);
 return result;
end $$;
revoke all on function public.operate_reservation(uuid,text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.operate_reservation(uuid,text,text,numeric,text) to service_role;

create function public.record_payment(p_event text,p_order text,p_payment text,p_amount integer,p_currency text,p_refund boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare booking public.reservations;
begin
 select * into booking from public.reservations where order_id=p_order for update;
 if not found then raise exception 'Unmatched payment'; end if;
 if p_currency<>'INR' or p_amount<>booking.amount_paise or (p_refund and booking.payment_id is distinct from p_payment) then raise exception 'Payment amount or identity mismatch'; end if;
 if exists(select 1 from public.payment_events where id=p_event) then return true; end if;
 if p_refund then
  if booking.payment_status not in ('paid','refund_requested','refunded') then raise exception 'Refund before payment'; end if;
 else
  if booking.status<>'completed' or (booking.payment_id is not null and booking.payment_id<>p_payment) then raise exception 'Invalid payment'; end if;
 end if;
 insert into public.payment_events(id,booking_id,payment_id,event,amount_paise) values(p_event,booking.id,p_payment,case when p_refund then 'refunded' else 'captured' end,p_amount);
 if p_refund then
  update public.reservations set payment_status='refunded' where id=booking.id;
  update public.session_ledger set settlement_status='refunded' where booking_id=booking.id;
 elsif booking.payment_status not in ('paid','refund_requested','refunded') then
  update public.reservations set payment_status='paid',payment_id=p_payment where id=booking.id;
  insert into public.session_ledger(booking_id,gross_paise,commission_paise,host_paise) values(booking.id,booking.amount_paise,booking.commission_paise,booking.amount_paise-booking.commission_paise) on conflict do nothing;
 end if;
 return true;
end $$;
revoke all on function public.record_payment(text,text,text,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.record_payment(text,text,text,integer,text,boolean) to service_role;

create function public.onboard_host(p_application uuid,p_actor text,p_listing jsonb,p_location jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare application public.marketplace_requests; listing_id uuid;
begin
 select * into application from public.marketplace_requests where id=p_application and kind='host' and status='pending_review' for update;
 if not found then raise exception 'Active host application not found'; end if;
 select id into listing_id from public.host_chargers where application_id=p_application;
 if found then return listing_id; end if;
 if jsonb_array_length(p_listing->'photos')<1 then raise exception 'Verified photos required'; end if;
 insert into public.host_chargers(owner_id,application_id,name,area,latitude,longitude,power_kw,price_paise_kwh,access_notes,photos,checks,status,verified_at)
 values(application.user_id,p_application,p_listing->>'name',p_listing->>'area',round((p_location->>'latitude')::numeric,2),round((p_location->>'longitude')::numeric,2),(p_listing->>'power_kw')::numeric,(p_listing->>'price_paise_kwh')::integer,p_listing->>'access_notes',p_listing->'photos',p_listing->'checks','approved',now()) returning id into listing_id;
 insert into public.host_locations(charger_id,address,latitude,longitude) values(listing_id,p_location->>'address',(p_location->>'latitude')::double precision,(p_location->>'longitude')::double precision);
 update public.marketplace_requests set reviewed_at=now(),operator_reply='Your host charger passed review and has a participating-host listing. Offered hours and reservations depend on pilot activation.' where id=p_application;
 insert into public.operation_events(actor,action,reference_id) values(p_actor,'host.approved',listing_id);
 return listing_id;
end $$;
revoke all on function public.onboard_host(uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.onboard_host(uuid,text,jsonb,jsonb) to service_role;

create table public.support_tickets (
 id uuid primary key default gen_random_uuid(), token_hash text not null,
 email text not null check(length(email)<=254),
 category text not null check(category in ('help','privacy','incident')),
 subject text not null check(length(subject) between 3 and 120),
 message text not null check(length(message) between 10 and 3000),
 reply text check(length(reply)<=4000),
 status text not null default 'open' check(status in ('open','answered','closed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from anon,authenticated;
grant select,insert,update,delete on public.support_tickets to service_role;
create index support_tickets_created on public.support_tickets(created_at desc);

create function public.cleanup_pilot_data() returns void language plpgsql security invoker set search_path='' as $$
begin
 delete from public.request_allowances where expires_at<now()-interval '2 days';
 delete from public.funnel_daily where day<current_date-interval '13 months';
 delete from public.support_tickets where updated_at<now()-interval '90 days' and status in ('answered','closed');
 delete from public.marketplace_requests r where kind in ('interest','host') and status='cancelled' and withdrawn_at<now()-interval '30 days' and not exists(select 1 from public.host_chargers c where c.application_id=r.id);
 -- Financial records and open privacy/incidents are never purged by this pilot job.
end $$;
revoke all on function public.cleanup_pilot_data() from public,anon,authenticated;
grant execute on function public.cleanup_pilot_data() to service_role;
commit;
