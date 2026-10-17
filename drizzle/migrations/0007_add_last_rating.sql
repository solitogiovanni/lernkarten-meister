ALTER TABLE public.nouns ADD COLUMN IF NOT EXISTS last_rating text;
ALTER TABLE public.verbs ADD COLUMN IF NOT EXISTS last_rating text;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS last_rating text;
ALTER TABLE public.saved_campaigns ADD COLUMN IF NOT EXISTS ratings text[] NOT NULL DEFAULT '{}';