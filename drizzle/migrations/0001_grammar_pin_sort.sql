ALTER TABLE public.grammar_notes ADD COLUMN IF NOT EXISTS pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.grammar_notes ADD COLUMN IF NOT EXISTS sort_order integer;
UPDATE public.grammar_notes g SET sort_order = s.rn FROM (SELECT id, row_number() OVER (ORDER BY title) AS rn FROM public.grammar_notes) s WHERE g.id = s.id;