# Extend Wortschatz to Adjectives & Adverbs

Add full support for German adjectives and adverbs alongside the existing nouns: separate decks, separate import flows, and a unified campaign that can mix any combination of word kinds.

## Data model

Add a single new table `words` for both adjectives and adverbs (their structure is identical: just a word and meanings, no article/plural). Keeps the existing `nouns` table untouched.

```text
type word_kind = 'adjective' | 'adverb'

words
  id uuid pk
  kind word_kind NOT NULL
  word text NOT NULL
  meanings text[] NOT NULL default '{}'
  examples text[] NOT NULL default '{}'
  themes text[] NOT NULL default '{}'
  ease, interval_days, due_at, reps, lapses, last_rated_at, created_at, updated_at
  -- same SRS columns and defaults as nouns
  -- RLS: public read/insert/update/delete (matches current nouns policies)
  -- indexes on (kind), (kind, due_at)
```

Migration creates the enum, table, RLS policies, and the `set_updated_at` trigger.

## Routes (new)

```text
src/routes/
  adjectives.tsx          deck for adjectives (kind='adjective')
  adverbs.tsx             deck for adverbs    (kind='adverb')
  import.adjectives.tsx   bulk import for adjectives
  import.adverbs.tsx      bulk import for adverbs
```

The deck pages reuse the same UI as the noun deck (search, theme filter as collapsible, due-today filter, add/edit drawer) but read/write the `words` table filtered by `kind`. They show `word` (no article styling). Theme aggregation is per-kind.

The import pages parse the simpler format `word = meaning1, meaning2, ...` (no article). Same duplicate-detection behavior as nouns (check existing rows in `words` for that `kind` plus draft list, amber highlight, exclude from save).

## Reusable form

Add `src/components/WordForm.tsx` — a stripped-down `NounForm`: fields are `word`, `meanings[]`, `examples[]`, `themes[]`. Used in both the adjective and adverb add/edit drawers.

## AI autofill

Add `src/server/autofill.functions.ts` export `autofillWords` (POST server fn) that takes `{ words: string[]; kind: 'adjective' | 'adverb' }`. Same Lovable AI gateway call pattern as `autofillNouns`, with a kind-aware system prompt that returns only `{ word, meanings (1–4 Italian), themes (1–3 Italian) }`. Tool-call schema mirrors current one minus article/plural.

## Navigation

`src/routes/__root.tsx`: header gets `Nouns`, `Adjectives`, `Adverbs`, `Import`, `Campaign`. Import becomes a small dropdown (or sub-links) listing the three import targets. On mobile the nav already wraps; we'll add `flex-wrap` and tighter padding so all entries stay reachable.

## Campaign updates

`src/routes/campaign.tsx`:
- New "Include" card with three toggles: Nouns / Adjectives / Adverbs (default: all on). At least one must be selected.
- Themes list aggregates across the selected kinds and sources (queries `nouns` + `words` filtered by chosen kinds).
- Mode/Direction/Scope/Size unchanged. Direction selector for Flashcards stays.
- Passes `kinds=noun,adjective,adverb` (CSV) in the search params to the run page.

`src/routes/campaign_.run.tsx`:
- `searchSchema` adds `kinds: fallback(z.string(), "noun").default("noun")`.
- Loader queries `nouns` and `words` (parallel) according to selected kinds, normalizes both into a single `Card` shape with a `kind` discriminator (`'noun' | 'adjective' | 'adverb'`), filters by scope/themes, shuffles, slices to `limit`.
- SRS update: writes back to the correct table (`nouns` vs `words`) based on `card.kind`.
- Flashcard front: nouns keep article styling; adjectives/adverbs show the bare word with a small kind label ("adjective" / "adverb") above. IT→DE direction works for all kinds (front = meanings, back = word).
- Quiz: builds `possibleTypes` per card — `article` and `plural` only for nouns; `de2it` / `it2de` for any card with meanings. Adjectives/adverbs effectively get translation-only quizzes.

## Files to add / change

Add:
- `supabase/migrations/<ts>_words_table.sql`
- `src/components/WordForm.tsx`
- `src/routes/adjectives.tsx`
- `src/routes/adverbs.tsx`
- `src/routes/import.adjectives.tsx`
- `src/routes/import.adverbs.tsx`

Edit:
- `src/server/autofill.functions.ts` — add `autofillWords` (export, keep `autofillNouns`)
- `src/routes/__root.tsx` — nav entries
- `src/routes/campaign.tsx` — kind toggles, cross-table theme aggregation, pass `kinds`
- `src/routes/campaign_.run.tsx` — load+merge from both tables, kind-aware quiz/flashcard, kind-aware SRS update

`src/integrations/supabase/types.ts` regenerates automatically after the migration.

## Out of scope

- Conjugation/comparative/superlative storage for adjectives (can be added later as optional fields).
- Migrating existing nouns into a unified table.

