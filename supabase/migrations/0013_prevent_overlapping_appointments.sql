
create extension if not exists btree_gist;

alter table public.appointments
add constraint appointments_no_scheduled_overlap
exclude using gist (
  business_id with =,
  tstzrange(start_time, end_time, '[)') with &&
)
where (status = 'SCHEDULED');
