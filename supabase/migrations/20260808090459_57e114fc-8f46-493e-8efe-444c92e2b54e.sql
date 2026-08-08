GRANT EXECUTE ON FUNCTION public.is_server_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.server_role(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.channel_server(uuid) TO authenticated;