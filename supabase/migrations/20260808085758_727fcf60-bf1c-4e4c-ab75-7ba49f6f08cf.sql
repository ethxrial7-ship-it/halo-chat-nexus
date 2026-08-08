
ALTER TABLE public.messages
  ADD CONSTRAINT messages_author_profile_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.server_members
  ADD CONSTRAINT server_members_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.conversation_members
  ADD CONSTRAINT conversation_members_profile_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
