CREATE TABLE public.recent_themes (theme text PRIMARY KEY, used_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recent_themes TO anon, authenticated;
GRANT ALL ON public.recent_themes TO service_role;
ALTER TABLE public.recent_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public all recent_themes" ON public.recent_themes FOR ALL USING (true) WITH CHECK (true);
INSERT INTO public.recent_themes (theme, used_at)
SELECT t, max(u) FROM (
  SELECT unnest(themes) t, updated_at u FROM public.nouns
  UNION ALL SELECT unnest(themes), updated_at FROM public.verbs
  UNION ALL SELECT unnest(themes), updated_at FROM public.words) s
WHERE trim(t) <> '' GROUP BY t ON CONFLICT DO NOTHING;