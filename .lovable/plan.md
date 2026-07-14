## Add Präteritum Konjugation to verbs

Add a new field storing the Präteritum conjugation (no pronouns), shown/edited alongside the existing Präsens Konjugation and filled by AI.

### 1. Database
Migration on `verbs` table:
- Add column `praeteritum_conjugation text` (nullable).

### 2. Form — `src/components/VerbForm.tsx`
- Extend `VerbFormValue` with `praeteritumConjugation: string`.
- Add an input directly below the existing "Konjugation (Präsens, no pronouns)" field, labeled **"Konjugation Präteritum (no pronouns)"**, placeholder e.g. `kam / kamst / kam / kamen / kamt / kamen`.
- Update `emptyVerb`.

### 3. Edit dialog — `src/components/CardEditDialog.tsx`
- Include `praeteritum_conjugation` in verb insert/update payloads and in the resulting `EditableCard` mapping.
- Wire initial state from `card.praeteritum_conjugation`.
- Extend `EditableCard` type with `praeteritum_conjugation?: string | null`.

### 4. AI autofill — `src/lib/autofill.functions.ts`
- In `autofillVerbs`, extend the Zod schema and the prompt so the model returns `praeteritum_conjugation` (six forms, slash-separated, no pronouns, matching the existing `conjugation` format).
- Return it in `results`.
- Update the AI-fill merge in `CardEditDialog` to populate the new field (only if empty), same pattern as `conjugation`.

### 5. Card display — `src/components/CardReveal.tsx`
- Render the Präteritum conjugation line below the Präsens conjugation when present.

### 6. Other verb entry points
- `src/routes/verbs.tsx` and `src/routes/import.verbs.tsx`: include the new field in select/insert/import so it round-trips and gets populated by bulk AI fill.

No changes to SRS logic, other decks, or existing verb rows (field is nullable; older cards simply won't show a Präteritum line until edited or re-filled).
