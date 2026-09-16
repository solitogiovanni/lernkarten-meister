ALTER TABLE public.nouns
  ADD COLUMN IF NOT EXISTS fold_noun text GENERATED ALWAYS AS (public.fold_de_i(noun)) STORED,
  ADD COLUMN IF NOT EXISTS fold_plural text GENERATED ALWAYS AS (public.fold_de_i(plural)) STORED,
  ADD COLUMN IF NOT EXISTS fold_meanings text GENERATED ALWAYS AS (public.fold_de_arr(meanings)) STORED;

ALTER TABLE public.verbs
  ADD COLUMN IF NOT EXISTS fold_present text GENERATED ALWAYS AS (public.fold_de_i(present)) STORED,
  ADD COLUMN IF NOT EXISTS fold_praeteritum text GENERATED ALWAYS AS (public.fold_de_i(praeteritum)) STORED,
  ADD COLUMN IF NOT EXISTS fold_perfect text GENERATED ALWAYS AS (public.fold_de_i(perfect)) STORED,
  ADD COLUMN IF NOT EXISTS fold_meanings text GENERATED ALWAYS AS (public.fold_de_arr(meanings)) STORED;

ALTER TABLE public.words
  ADD COLUMN IF NOT EXISTS fold_word text GENERATED ALWAYS AS (public.fold_de_i(word)) STORED,
  ADD COLUMN IF NOT EXISTS fold_meanings text GENERATED ALWAYS AS (public.fold_de_arr(meanings)) STORED;

CREATE INDEX IF NOT EXISTS nouns_fold_noun_col_trgm_idx ON public.nouns USING GIN (fold_noun gin_trgm_ops);
CREATE INDEX IF NOT EXISTS nouns_fold_plural_col_trgm_idx ON public.nouns USING GIN (fold_plural gin_trgm_ops);
CREATE INDEX IF NOT EXISTS nouns_fold_meanings_col_trgm_idx ON public.nouns USING GIN (fold_meanings gin_trgm_ops);
CREATE INDEX IF NOT EXISTS verbs_fold_present_col_trgm_idx ON public.verbs USING GIN (fold_present gin_trgm_ops);
CREATE INDEX IF NOT EXISTS verbs_fold_praeteritum_col_trgm_idx ON public.verbs USING GIN (fold_praeteritum gin_trgm_ops);
CREATE INDEX IF NOT EXISTS verbs_fold_perfect_col_trgm_idx ON public.verbs USING GIN (fold_perfect gin_trgm_ops);
CREATE INDEX IF NOT EXISTS verbs_fold_meanings_col_trgm_idx ON public.verbs USING GIN (fold_meanings gin_trgm_ops);
CREATE INDEX IF NOT EXISTS words_fold_word_col_trgm_idx ON public.words USING GIN (fold_word gin_trgm_ops);
CREATE INDEX IF NOT EXISTS words_fold_meanings_col_trgm_idx ON public.words USING GIN (fold_meanings gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.search_nouns_by_meaning(term text)
RETURNS SETOF public.nouns
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH t AS (SELECT public.fold_de_i(term) AS f)
  SELECT n.* FROM public.nouns n, t
  WHERE n.fold_noun LIKE '%' || t.f || '%'
     OR n.fold_plural LIKE '%' || t.f || '%'
     OR n.fold_meanings LIKE '%' || t.f || '%'
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.search_verbs_by_meaning(term text)
RETURNS SETOF public.verbs
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH t AS (SELECT public.fold_de_i(term) AS f)
  SELECT v.* FROM public.verbs v, t
  WHERE v.fold_present LIKE '%' || t.f || '%'
     OR v.fold_praeteritum LIKE '%' || t.f || '%'
     OR v.fold_perfect LIKE '%' || t.f || '%'
     OR v.fold_meanings LIKE '%' || t.f || '%'
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.search_words_by_meaning(term text)
RETURNS SETOF public.words
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  WITH t AS (SELECT public.fold_de_i(term) AS f)
  SELECT w.* FROM public.words w, t
  WHERE w.fold_word LIKE '%' || t.f || '%'
     OR w.fold_meanings LIKE '%' || t.f || '%'
  LIMIT 40;
$function$;