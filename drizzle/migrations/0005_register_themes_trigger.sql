CREATE OR REPLACE FUNCTION public.register_card_themes()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE t text; i int := 0;
BEGIN
  FOREACH t IN ARRAY coalesce(NEW.themes, '{}'::text[]) LOOP
    IF btrim(t) <> '' AND (TG_OP = 'INSERT' OR NOT (t = ANY(coalesce(OLD.themes, '{}'::text[])))) THEN
      INSERT INTO public.recent_themes(theme, used_at) VALUES (btrim(t), now() - (i || ' milliseconds')::interval)
      ON CONFLICT (theme) DO UPDATE SET used_at = EXCLUDED.used_at;
      i := i + 1;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER nouns_register_themes AFTER INSERT OR UPDATE OF themes ON public.nouns FOR EACH ROW EXECUTE FUNCTION public.register_card_themes();
CREATE TRIGGER verbs_register_themes AFTER INSERT OR UPDATE OF themes ON public.verbs FOR EACH ROW EXECUTE FUNCTION public.register_card_themes();
CREATE TRIGGER words_register_themes AFTER INSERT OR UPDATE OF themes ON public.words FOR EACH ROW EXECUTE FUNCTION public.register_card_themes();