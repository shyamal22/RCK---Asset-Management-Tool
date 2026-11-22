-- Private bucket for asset photos (and, later, documents). No direct client access: the server
-- checks permissions (RLS on assets), uploads with the service key and hands out short signed links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('asset-photos', 'asset-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
