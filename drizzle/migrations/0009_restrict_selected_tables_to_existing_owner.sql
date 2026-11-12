-- This is a single-account private learning app. Preserve the existing owner's
-- shared card collection while denying anonymous and unrelated account access.
ALTER POLICY "Public delete words" ON public.words TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public insert words" ON public.words TO authenticated WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public read words" ON public.words TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public update words" ON public.words TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid) WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public delete nouns" ON public.nouns TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public insert nouns" ON public.nouns TO authenticated WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public read nouns" ON public.nouns TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public update nouns" ON public.nouns TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid) WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public delete verbs" ON public.verbs TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public insert verbs" ON public.verbs TO authenticated WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public read verbs" ON public.verbs TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public update verbs" ON public.verbs TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid) WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public all recent_themes" ON public.recent_themes TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid) WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public delete saved_campaigns" ON public.saved_campaigns TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public insert saved_campaigns" ON public.saved_campaigns TO authenticated WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public read saved_campaigns" ON public.saved_campaigns TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public update saved_campaigns" ON public.saved_campaigns TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid) WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public all grammar_folders" ON public.grammar_folders TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid) WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public delete grammar_notes" ON public.grammar_notes TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public insert grammar_notes" ON public.grammar_notes TO authenticated WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public read grammar_notes" ON public.grammar_notes TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
ALTER POLICY "Public update grammar_notes" ON public.grammar_notes TO authenticated USING ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid) WITH CHECK ((SELECT auth.uid()) = '6804ad53-b4de-4cbf-9ae7-10afde32df2f'::uuid);
REVOKE ALL PRIVILEGES ON TABLE public.words, public.nouns, public.verbs, public.recent_themes, public.saved_campaigns, public.grammar_folders, public.grammar_notes FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.words, public.nouns, public.verbs, public.recent_themes, public.saved_campaigns, public.grammar_folders, public.grammar_notes TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.words, public.nouns, public.verbs, public.recent_themes, public.saved_campaigns, public.grammar_folders, public.grammar_notes TO service_role;