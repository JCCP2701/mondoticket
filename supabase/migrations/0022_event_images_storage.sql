-- Real event image uploads via Supabase Storage. events.image_url already
-- existed as a column since 0001_init but nothing ever wrote to it or
-- served files for it -- CreateEvent.tsx's file picker was decorative
-- (always showed a fixed stock photo, never touched the real file).
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

create policy "public read event images"
on storage.objects for select
using (bucket_id = 'event-images');

create policy "org managers upload event images"
on storage.objects for insert
with check (
  bucket_id = 'event-images'
  and exists (
    select 1 from profiles
    where id = auth.uid() and role in ('organization', 'superadmin')
  )
);

create policy "org managers update own event images"
on storage.objects for update
using (bucket_id = 'event-images' and owner = auth.uid());

create policy "org managers delete own event images"
on storage.objects for delete
using (bucket_id = 'event-images' and owner = auth.uid());
