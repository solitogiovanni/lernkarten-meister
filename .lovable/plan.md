
## Goal

Add German **verbs** as a third card type alongside nouns and adjectives/adverbs, with their own import tool, deck page, and campaign support.

## Verb card fields

- `present` — infinitive / present base form (e.g. `gehen`)
- `praeteritum` — Präteritum 3rd person sg. (e.g. `ging`)
- `perfect` — Perfekt with auxiliary, stored as one string (e.g. `ist gegangen`, `hat gemacht`). The auxiliary (`sein`/`haben`) is part of this field.
- `prepositions` — array of `{ preposition: string; case?: 'akk'|'dat'|'gen'|null; meaning?: string }` (multiple lines, one per preposition; e.g. `warten auf + Akk = aspettare`)
- `meanings` — Italian translations (string[])
- `examples` — German example sentences (string[])
- `themes` — Italian thematic tags (string[])
- Plus standard SRS columns (`ease`, `interval_days`, `due_at`, `reps`, `lapses`, `last_rated_at`).

## Database

New table `public.verbs`:

```text
id uuid pk
present text not null
praeteritum text
perfect text          -- includes auxiliary, e.g. "ist gegangen"
prepositions jsonb not null default '[]'  -- array of {preposition, case, meaning}
meanings text[] not null default '{}'
examples text[] not null default '{}'
themes text[] not null default '{}'
ease real not null default 2.5
interval_days int not null default 0
due_at timestamptz not null default now()
reps int not null default 0
lapses int not null default 0
last_rated_at timestamptz
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

- RLS enabled with same public select/insert/update/delete policies as `nouns`/`words` (matches current app model).
- `set_updated_at` trigger.

## Server: AI autofill for verbs

Extend `src/server/autofill.functions.ts` with `autofillVerbs` (createServerFn):

- Input: `{ verbs: string[] }` (max 50)
- Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with a tool schema returning, per item:
  - `present`, `praeteritum`, `perfect` (with `ist`/`hat`), `prepositions: [{preposition, case, meaning}]`, `meanings`, `themes`
- Same error handling pattern (429 / 402 / generic).

## Import UI

New route **`src/routes/import.verbs.tsx`** (matches sibling `import.adjectives.tsx`, `import.adverbs.tsx`).

- Textarea: one verb per line, free-form (`gehen = andare`, `warten auf = aspettare`, etc.).
- Buttons: **Auto-fill with AI** and **Skip AI**.
- Drafts table per row, editable:
  - `present`, `praeteritum`, `perfect` inputs
  - **Prepositions block**: list of editable rows, each with `preposition` input + `case` selector (Akk/Dat/Gen/—) + `meaning` input + remove button, plus an **+ Add preposition** button
  - `meanings` (comma list)
  - `themes` (chips with `+ theme`)
- Duplicate detection by `present` (lowercased) against existing rows in `verbs`.
- **Save all** → `supabase.from('verbs').insert(rows)` → navigate to `/verbs`.

Also update **`src/routes/import_.tsx`** (the import hub) to add a "Verbs" card linking to `/import/verbs`, alongside existing Nouns/Adjectives/Adverbs entries.

## Verb deck page

New route **`src/routes/verbs.tsx`** that renders a new component **`src/components/VerbDeckPage.tsx`** (similar shape to `WordDeckPage`):

- List/grid of verb cards showing `present` prominently, with `praeteritum` and `perfect` underneath, prepositions as small chips, meanings + themes.
- Search by present/meaning, theme filter, due-only filter (matching existing deck UX).
- Edit dialog (reuse pattern from `CardEditDialog` — see "Editing & type changes" below).
- "Import verbs" link to `/import/verbs`.

Add a **Verbs** link in the top nav (`src/routes/__root.tsx`).

## Campaign integration

In `src/routes/campaign.tsx`:
- Extend `Item['kind']` and the `kinds` set to include `"verb"`.
- Fetch verbs alongside nouns/words.
- Add a "Verbs" toggle button.

In `src/routes/campaign_.run.tsx`:
- Load verbs when `kinds` includes `verb`.
- Render verb cards: front shows `present` (or Italian meanings for IT→DE), back shows full conjugation (`present` / `praeteritum` / `perfect`), prepositions, meanings, examples.
- SRS rating writes back to the `verbs` table.

## Editing & type changes

Update `src/components/CardEditDialog.tsx` to support `verb` as a third kind:
- Type selector now Noun / Adjective / Adverb / **Verb**.
- New `VerbForm` component (`src/components/VerbForm.tsx`) used when `kind === 'verb'` with fields above (incl. repeatable prepositions block).
- Migration logic: switching to/from `verb` moves the row between `nouns`/`words`/`verbs` while preserving SRS metadata, mirroring the existing noun↔word migration.

## Files touched

- **New**: SQL migration for `verbs` table + RLS + trigger
- **New**: `src/routes/import.verbs.tsx`
- **New**: `src/routes/verbs.tsx`
- **New**: `src/components/VerbDeckPage.tsx`
- **New**: `src/components/VerbForm.tsx`
- **Edit**: `src/server/autofill.functions.ts` (add `autofillVerbs`)
- **Edit**: `src/routes/import_.tsx` (add Verbs entry to hub)
- **Edit**: `src/routes/__root.tsx` (nav link)
- **Edit**: `src/routes/campaign.tsx` and `src/routes/campaign_.run.tsx` (verb support)
- **Edit**: `src/components/CardEditDialog.tsx` (verb option + migration)

## Open question

For the SM-2 spaced-repetition data, OK to keep SRS state per row in the `verbs` table just like `nouns`/`words`? (Plan assumes yes — same pattern.)
