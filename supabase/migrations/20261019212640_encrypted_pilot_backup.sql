-- Small pilot application-data backup only. Auth, Storage and larger projects need provider backups.
create function public.export_pilot_snapshot() returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare snapshot jsonb;
begin
 select jsonb_build_object('version',1,'createdAt',now(),'tables',jsonb_build_object(
 'marketplace_requests',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.marketplace_requests r),
 'host_chargers',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.host_chargers r),
 'host_locations',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.host_locations r),
 'host_slots',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.host_slots r),
 'reservations',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.reservations r),
 'operation_events',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.operation_events r),
 'payment_events',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.payment_events r),
 'session_ledger',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.session_ledger r),
 'support_tickets',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.support_tickets r),
 'funnel_daily',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from public.funnel_daily r)
 )) into snapshot;
 if octet_length(snapshot::text)>2000000 then raise exception 'Pilot snapshot exceeds export limit. Use managed database backups.'; end if;
 return snapshot;
end $$;
revoke all on function public.export_pilot_snapshot() from public,anon,authenticated;
grant execute on function public.export_pilot_snapshot() to service_role;
