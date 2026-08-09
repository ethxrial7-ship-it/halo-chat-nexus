ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text,
  ADD COLUMN IF NOT EXISTS attachment_size bigint,
  ADD COLUMN IF NOT EXISTS attachment_type text;

ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';

CREATE OR REPLACE FUNCTION public.can_read_attachment(_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.attachment_path = _path
      AND (
        (m.channel_id IS NOT NULL AND public.is_server_member(public.channel_server(m.channel_id), auth.uid()))
        OR (m.conversation_id IS NOT NULL AND public.is_conversation_member(m.conversation_id, auth.uid()))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_read_attachment(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.server_preview_by_invite(_code text)
RETURNS TABLE (id uuid, name text, icon_url text, member_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.name, s.icon_url,
         (SELECT count(*) FROM public.server_members sm WHERE sm.server_id = s.id)
  FROM public.servers s
  WHERE s.invite_code = lower(trim(_code));
$$;

GRANT EXECUTE ON FUNCTION public.server_preview_by_invite(text) TO authenticated, anon;

CREATE POLICY "attachments_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "attachments_select_members"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.can_read_attachment(name))
);

CREATE POLICY "attachments_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'attachments' AND (storage.foldername(name))[1] = auth.uid()::text);