CREATE TABLE public.call_sound_overrides (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.call_sound_overrides TO authenticated;
GRANT ALL ON public.call_sound_overrides TO service_role;
ALTER TABLE public.call_sound_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY call_sound_read ON public.call_sound_overrides FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY call_sound_admin_insert ON public.call_sound_overrides FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY call_sound_admin_update ON public.call_sound_overrides FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
COMMENT ON TABLE public.call_sound_overrides IS 'Admin-controlled forced surprise ringtones; disabled restores the normal 1 percent chance.';