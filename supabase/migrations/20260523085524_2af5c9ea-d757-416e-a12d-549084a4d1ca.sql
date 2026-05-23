CREATE OR REPLACE FUNCTION public.search_nouns_by_meaning(term text)
 RETURNS SETOF nouns
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT n.* FROM public.nouns n
  WHERE EXISTS (SELECT 1 FROM unnest(n.meanings) m WHERE m ILIKE '%' || term || '%')
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.search_verbs_by_meaning(term text)
 RETURNS SETOF verbs
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT v.* FROM public.verbs v
  WHERE EXISTS (SELECT 1 FROM unnest(v.meanings) m WHERE m ILIKE '%' || term || '%')
  LIMIT 20;
$function$;

CREATE OR REPLACE FUNCTION public.search_words_by_meaning(term text)
 RETURNS SETOF words
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT w.* FROM public.words w
  WHERE EXISTS (SELECT 1 FROM unnest(w.meanings) m WHERE m ILIKE '%' || term || '%')
  LIMIT 40;
$function$;