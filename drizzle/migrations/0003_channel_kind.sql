ALTER TABLE public.channels ADD COLUMN kind text NOT NULL DEFAULT 'text';
ALTER TABLE public.channels ADD CONSTRAINT channels_kind_check CHECK (kind IN ('text','voice'));