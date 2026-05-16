## Goal

Add a new "conjugation" field to verbs storing the 6 present-tense forms without pronouns (e.g. `komme / kommst / kommt / kommen / kommt / kommen`). The field is filled automatically by the AI when using the autofill / AI fill flow, editable in the verb form, and shown on the flashcard front/back.

## Changes

### 1. Database
- Migration: `ALTER TABLE public.verbs ADD COLUMN conjugation text;`

### 2. AI autofill (`src/server/autofill.functions.ts`)
- Extend system prompts (both `autofillVerbs` and the verb branch of `autofillMixed`) to ask for `conjugation`: the present-tense forms ich/du/er/wir/ihr/sie joined as `form1 / form2 / form3 / form4 / form5 / form6`, no pronouns.
- Add `conjugation: string` to `AutofilledVerb` and to `MixedItem` (verb branch).
- Add `conjugation: { type: "string" }` to both tool JSON schemas.
- Map `it.conjugation ?? ""` into results.

### 3. Verb form (`src/components/VerbForm.tsx`)
- Add `conjugation: string` to `VerbFormValue` and `emptyVerb`.
- Add an Input next to Present/Präteritum/Perfekt (place it as a full-width row under the 3-column grid since the string is long), placeholder `komme / kommst / kommt / kommen / kommt / kommen`.

### 4. Verb import flow
- Wherever `AutofilledVerb` / `MixedItem` results are persisted to the verbs table (verb + mixed import pages), include the new `conjugation` field when inserting.

### 5. Flashcard display
- `src/components/CardReveal.tsx`: show conjugation on the verb back side, below Präteritum/Perfekt, with the same styled look (small label "Konjugation" + value).
- `src/routes/campaign_.run.tsx`: same display in the campaign card view.
- No SpeakButton needed for this field (it's a list of forms, not a single pronounceable phrase) — confirm in the question below.

### 6. Types
- `src/integrations/supabase/types.ts` regenerates automatically after migration.

## Open question

The user described the field as a single slash-separated string. The plan stores it as `text` and renders it verbatim. If they'd prefer 6 separate columns/inputs, I'd restructure — but the example strongly implies a single field. I'll proceed with the single-string approach unless told otherwise.
