
CREATE TYPE public.german_article AS ENUM ('der', 'die', 'das');

CREATE TABLE public.nouns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article public.german_article,
  noun TEXT NOT NULL,
  plural TEXT,
  meanings TEXT[] NOT NULL DEFAULT '{}',
  examples TEXT[] NOT NULL DEFAULT '{}',
  themes TEXT[] NOT NULL DEFAULT '{}',
  ease REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reps INTEGER NOT NULL DEFAULT 0,
  lapses INTEGER NOT NULL DEFAULT 0,
  last_rated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX nouns_due_at_idx ON public.nouns (due_at);
CREATE INDEX nouns_themes_idx ON public.nouns USING GIN (themes);

ALTER TABLE public.nouns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nouns" ON public.nouns FOR SELECT USING (true);
CREATE POLICY "Public insert nouns" ON public.nouns FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update nouns" ON public.nouns FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete nouns" ON public.nouns FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER nouns_set_updated_at BEFORE UPDATE ON public.nouns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
