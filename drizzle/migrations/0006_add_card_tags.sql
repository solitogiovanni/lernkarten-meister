ALTER TABLE public.nouns ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.verbs ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS nouns_tags_gin ON public.nouns USING gin (tags);
CREATE INDEX IF NOT EXISTS verbs_tags_gin ON public.verbs USING gin (tags);
CREATE INDEX IF NOT EXISTS words_tags_gin ON public.words USING gin (tags);
CREATE INDEX IF NOT EXISTS grammar_notes_tags_gin ON public.grammar_notes USING gin (tags);