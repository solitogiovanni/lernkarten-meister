CREATE OR REPLACE FUNCTION public.fold_de_arr(t text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $function$
  SELECT public.fold_de_i(pg_catalog.array_to_string(coalesce(t, ARRAY[]::text[]), ' '::text));
$function$;