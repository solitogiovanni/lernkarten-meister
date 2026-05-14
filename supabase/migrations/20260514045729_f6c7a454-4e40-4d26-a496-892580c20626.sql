
CREATE OR REPLACE FUNCTION public.search_nouns_by_meaning(term text)
RETURNS SETOF public.nouns
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT n.* FROM public.nouns n
  WHERE EXISTS (SELECT 1 FROM unnest(n.meanings) m WHERE m ILIKE '%' || term || '%')
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.search_verbs_by_meaning(term text)
RETURNS SETOF public.verbs
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.* FROM public.verbs v
  WHERE EXISTS (SELECT 1 FROM unnest(v.meanings) m WHERE m ILIKE '%' || term || '%')
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.search_words_by_meaning(term text)
RETURNS SETOF public.words
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT w.* FROM public.words w
  WHERE EXISTS (SELECT 1 FROM unnest(w.meanings) m WHERE m ILIKE '%' || term || '%')
  LIMIT 40;
$$;

GRANT EXECUTE ON FUNCTION public.search_nouns_by_meaning(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_verbs_by_meaning(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_words_by_meaning(text) TO anon, authenticated;
