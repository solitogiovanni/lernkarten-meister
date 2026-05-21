CREATE TABLE public.grammar_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grammar_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read grammar_notes" ON public.grammar_notes FOR SELECT USING (true);
CREATE POLICY "Public insert grammar_notes" ON public.grammar_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update grammar_notes" ON public.grammar_notes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete grammar_notes" ON public.grammar_notes FOR DELETE USING (true);

CREATE TRIGGER trg_grammar_notes_updated_at
BEFORE UPDATE ON public.grammar_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();