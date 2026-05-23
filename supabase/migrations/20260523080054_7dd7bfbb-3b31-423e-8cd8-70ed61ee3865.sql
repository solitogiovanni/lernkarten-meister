CREATE TABLE public.saved_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mode TEXT NOT NULL,
  direction TEXT NOT NULL,
  scope TEXT NOT NULL,
  kinds TEXT[] NOT NULL DEFAULT '{}',
  themes TEXT[] NOT NULL DEFAULT '{}',
  size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read saved_campaigns" ON public.saved_campaigns FOR SELECT USING (true);
CREATE POLICY "Public insert saved_campaigns" ON public.saved_campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update saved_campaigns" ON public.saved_campaigns FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete saved_campaigns" ON public.saved_campaigns FOR DELETE USING (true);

CREATE TRIGGER saved_campaigns_set_updated_at
BEFORE UPDATE ON public.saved_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();