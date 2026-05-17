Complete the remaining `conjugation` field integration so it flows end-to-end across all verb surfaces.

## Changes

1. **`src/routes/import_.tsx`** (mixed importer)
   - Extend the AI-fill mapping so verb-branch `MixedItem` results include `conjugation`.
   - Add a Konjugation input field to the verb draft UI (matching the layout used in `import.verbs.tsx`).
   - Persist `conjugation` when inserting verbs.

2. **`src/routes/campaign_.run.tsx`** (flashcard runner)
   - Add `conjugation?: string` to the verb card type.
   - Include `conjugation` in the verb fetch query.
   - Render it on the back of verb flashcards, below Perfekt, styled like the other verb form rows (no SpeakButton — it's a list of forms).

3. **`src/routes/verbs.tsx`** (verb preview dialog)
   - Pass `conjugation` into the `CardReveal` / preview dialog props so the existing display section actually receives data.

No schema or autofill changes — those already landed in the previous step.
