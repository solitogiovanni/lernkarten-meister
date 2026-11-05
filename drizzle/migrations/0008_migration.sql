ALTER TABLE public.nouns ADD COLUMN IF NOT EXISTS confused_with jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.verbs ADD COLUMN IF NOT EXISTS confused_with jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS confused_with jsonb NOT NULL DEFAULT '[]'::jsonb;