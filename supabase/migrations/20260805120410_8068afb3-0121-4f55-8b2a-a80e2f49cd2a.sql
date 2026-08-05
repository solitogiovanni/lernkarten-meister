ALTER TABLE public.nouns
  ADD COLUMN IF NOT EXISTS synonyms text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS antonyms text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.verbs
  ADD COLUMN IF NOT EXISTS synonyms text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS antonyms text[] NOT NULL DEFAULT '{}'::text[];

ALTER TABLE public.words
  ADD COLUMN IF NOT EXISTS synonyms text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS antonyms text[] NOT NULL DEFAULT '{}'::text[];