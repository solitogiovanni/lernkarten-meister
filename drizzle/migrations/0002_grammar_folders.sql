CREATE TABLE public.grammar_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#10b981',
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grammar_folders TO anon, authenticated;
GRANT ALL ON public.grammar_folders TO service_role;
ALTER TABLE public.grammar_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all grammar_folders" ON public.grammar_folders FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE public.grammar_notes ADD COLUMN folder_id uuid REFERENCES public.grammar_folders(id) ON DELETE SET NULL;