
REVOKE EXECUTE ON FUNCTION public.is_server_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.server_role(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.channel_server(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.join_server_by_invite(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE sid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT id INTO sid FROM public.servers WHERE invite_code = lower(trim(_code));
  IF sid IS NULL THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (sid, auth.uid(), 'member')
  ON CONFLICT (server_id, user_id) DO NOTHING;
  RETURN sid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.join_server_by_invite(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.join_server_by_invite(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.start_direct_message(_other_user uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cid uuid; me uuid := auth.uid();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _other_user = me THEN RAISE EXCEPTION 'Cannot DM yourself'; END IF;
  SELECT c.id INTO cid FROM public.conversations c
  WHERE c.is_group = false
    AND EXISTS (SELECT 1 FROM public.conversation_members m WHERE m.conversation_id = c.id AND m.user_id = me)
    AND EXISTS (SELECT 1 FROM public.conversation_members m WHERE m.conversation_id = c.id AND m.user_id = _other_user)
    AND (SELECT count(*) FROM public.conversation_members m WHERE m.conversation_id = c.id) = 2
  LIMIT 1;
  IF cid IS NOT NULL THEN RETURN cid; END IF;
  INSERT INTO public.conversations (is_group, created_by) VALUES (false, me) RETURNING id INTO cid;
  INSERT INTO public.conversation_members (conversation_id, user_id) VALUES (cid, me), (cid, _other_user);
  RETURN cid;
END; $$;
REVOKE EXECUTE ON FUNCTION public.start_direct_message(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.start_direct_message(uuid) TO authenticated;
