ALTER TABLE public.messages ADD COLUMN bot_name text;

CREATE OR REPLACE FUNCTION public.guard_bot_name()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.bot_name IS NOT NULL AND coalesce(auth.role(), '') <> 'service_role' THEN
    NEW.bot_name := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER messages_guard_bot_name BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_bot_name();