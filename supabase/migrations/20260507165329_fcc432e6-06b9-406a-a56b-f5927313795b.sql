CREATE TABLE public.verbs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  present TEXT NOT NULL,
  praeteritum TEXT,
  perfect TEXT,
  prepositions JSONB NOT NULL DEFAULT '[]'::jsonb,
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

ALTER TABLE public.verbs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read verbs" ON public.verbs FOR SELECT USING (true);
CREATE POLICY "Public insert verbs" ON public.verbs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update verbs" ON public.verbs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete verbs" ON public.verbs FOR DELETE USING (true);

CREATE TRIGGER set_verbs_updated_at
BEFORE UPDATE ON public.verbs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();