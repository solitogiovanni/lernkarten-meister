CREATE OR REPLACE FUNCTION public.fold_de(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT replace(
           replace(
             replace(
               replace(
                 translate(
                   replace(
                     replace(
                       replace(
                         replace(lower(coalesce(t, '')), 'ß', 'ss'),
                       'ä', 'a'),
                     'ö', 'o'),
                   'ü', 'u'),
                   'àáâãåÀÁÂÃÅèéêëÈÉÊËìíîïÌÍÎÏòóôõÒÓÔÕùúûÙÚÛçÇñÑýÿÝ',
                   'aaaaaaaaaaeeeeeeeeiiiiiiiioooooooooouuuuuuccnnyyy'
                 ),
               'ae', 'a'),
             'oe', 'o'),
           'ue', 'u'),
         'ss', 's');
$$;

CREATE OR REPLACE FUNCTION public.search_nouns_by_meaning(term text)
RETURNS SETOF nouns
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT n.* FROM public.nouns n
  WHERE public.fold_de(n.noun) LIKE '%' || public.fold_de(term) || '%'
     OR public.fold_de(coalesce(n.plural, '')) LIKE '%' || public.fold_de(term) || '%'
     OR EXISTS (SELECT 1 FROM unnest(n.meanings) m WHERE public.fold_de(m) LIKE '%' || public.fold_de(term) || '%')
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.search_verbs_by_meaning(term text)
RETURNS SETOF verbs
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT v.* FROM public.verbs v
  WHERE public.fold_de(v.present) LIKE '%' || public.fold_de(term) || '%'
     OR public.fold_de(coalesce(v.praeteritum, '')) LIKE '%' || public.fold_de(term) || '%'
     OR public.fold_de(coalesce(v.perfect, '')) LIKE '%' || public.fold_de(term) || '%'
     OR EXISTS (SELECT 1 FROM unnest(v.meanings) m WHERE public.fold_de(m) LIKE '%' || public.fold_de(term) || '%')
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION public.search_words_by_meaning(term text)
RETURNS SETOF words
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT w.* FROM public.words w
  WHERE public.fold_de(w.word) LIKE '%' || public.fold_de(term) || '%'
     OR EXISTS (SELECT 1 FROM unnest(w.meanings) m WHERE public.fold_de(m) LIKE '%' || public.fold_de(term) || '%')
  LIMIT 40;
$$;