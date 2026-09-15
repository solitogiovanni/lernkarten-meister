CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.fold_de_i(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $function$
  SELECT pg_catalog.replace(
           pg_catalog.replace(
             pg_catalog.replace(
               pg_catalog.replace(
                 pg_catalog.translate(
                   pg_catalog.replace(
                     pg_catalog.replace(
                       pg_catalog.replace(
                         pg_catalog.replace(pg_catalog.lower(coalesce(t, ''::text)), 'ß', 'ss'),
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
$function$;

CREATE OR REPLACE FUNCTION public.fold_de_arr(t text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $function$
  SELECT public.fold_de_i(array_to_string(coalesce(t, ARRAY[]::text[]), ' '));
$function$;

CREATE INDEX IF NOT EXISTS nouns_fold_noun_trgm_idx ON public.nouns USING GIN (public.fold_de_i(noun) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS nouns_fold_plural_trgm_idx ON public.nouns USING GIN (public.fold_de_i(plural) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS nouns_fold_meanings_trgm_idx ON public.nouns USING GIN (public.fold_de_arr(meanings) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS verbs_fold_present_trgm_idx ON public.verbs USING GIN (public.fold_de_i(present) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS verbs_fold_praeteritum_trgm_idx ON public.verbs USING GIN (public.fold_de_i(praeteritum) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS verbs_fold_perfect_trgm_idx ON public.verbs USING GIN (public.fold_de_i(perfect) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS verbs_fold_meanings_trgm_idx ON public.verbs USING GIN (public.fold_de_arr(meanings) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS words_fold_word_trgm_idx ON public.words USING GIN (public.fold_de_i(word) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS words_fold_meanings_trgm_idx ON public.words USING GIN (public.fold_de_arr(meanings) gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_nouns_by_meaning(term text)
RETURNS SETOF public.nouns
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT n.* FROM public.nouns n
  WHERE public.fold_de_i(n.noun) LIKE '%' || public.fold_de_i(term) || '%'
     OR public.fold_de_i(n.plural) LIKE '%' || public.fold_de_i(term) || '%'
     OR public.fold_de_arr(n.meanings) LIKE '%' || public.fold_de_i(term) || '%'
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.search_verbs_by_meaning(term text)
RETURNS SETOF public.verbs
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT v.* FROM public.verbs v
  WHERE public.fold_de_i(v.present) LIKE '%' || public.fold_de_i(term) || '%'
     OR public.fold_de_i(v.praeteritum) LIKE '%' || public.fold_de_i(term) || '%'
     OR public.fold_de_i(v.perfect) LIKE '%' || public.fold_de_i(term) || '%'
     OR public.fold_de_arr(v.meanings) LIKE '%' || public.fold_de_i(term) || '%'
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.search_words_by_meaning(term text)
RETURNS SETOF public.words
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT w.* FROM public.words w
  WHERE public.fold_de_i(w.word) LIKE '%' || public.fold_de_i(term) || '%'
     OR public.fold_de_arr(w.meanings) LIKE '%' || public.fold_de_i(term) || '%'
  LIMIT 40;
$function$;