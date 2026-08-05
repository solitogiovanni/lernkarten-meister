# Synonyms and Opposites on cards

Add two new list fields — **Synonyms** and **Opposites (Contrary)** — to Noun, Verb, Adjective and Adverb cards, and have the AI Fill / Auto-detect features populate them when they exist.

## What changes for you

- Each Noun, Verb, Adjective and Adverb card gains two tag-style fields: Synonyms and Opposites, edited exactly like the existing Meanings/Themes chips (type, Enter, chip appears).
- The fields show on the card preview and on the flashcard back during a campaign, each with a pronunciation speaker icon like other German text.
- Pressing **AI Fill** (deck pages, campaign card editor, Auto-detect dialog, and the importers) fills German synonyms and opposites when they exist for that word; when none apply, the fields stay empty rather than being invented.
- Prepositions, pronouns and conjunctions keep their current fields — no synonym/opposite inputs there.

## Technical outline

Database migration
- Add `synonyms text[] not null default '{}'` and `antonyms text[] not null default '{}'` to `public.nouns`, `public.verbs`, `public.words`.

Forms
- `NounForm.tsx`, `VerbForm.tsx`, `WordForm.tsx`: add `synonyms` / `antonyms` to the value type and empty defaults, plus two `ChipInput` blocks. In `WordForm`, render them only for `adjective` and `adverb` kinds.

Display
- `CardReveal.tsx`: render both lists as badges with `SpeakButton` per entry.
- `campaign_.run.tsx`: add the fields to the `Card` type, the select lists, the row mappers, and the flashcard back.

AI
- `src/lib/autofill.functions.ts`: extend the noun/verb/word autofill schemas and prompts (and the mixed-import + `detectWordKinds` schemas) with `synonyms` and `antonyms`, instructing the model to return German lemmas only and empty arrays when nothing fits.

Persistence
- Include the two fields in insert/update payloads and load selects in: `routes/index.tsx` (nouns), `routes/verbs.tsx`, `components/WordDeckPage.tsx`, `components/CardEditDialog.tsx`, `components/AutoDetectDialog.tsx`, `routes/import_.tsx`, `routes/import.verbs.tsx`, `components/WordImportPage.tsx`.
