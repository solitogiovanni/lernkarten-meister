## German Learning App — Nouns

A personal app to build a German noun deck and run memorization campaigns. Future expansion to verbs, adjectives, adverbs.

### Data model (Lovable Cloud)

`nouns` table:
- `id`, `created_at`, `updated_at`
- `article` — der / die / das
- `noun` (text)
- `plural` (text)
- `meanings` (text[]) — multiple Italian translations
- `examples` (text[]) — one or more German sentences
- `themes` (text[]) — multi-tag
- SRS fields: `ease`, `interval_days`, `due_at`, `reps`, `lapses`, `last_rated_at`

No auth (single user). RLS open for now; can add login later without restructuring.

### Pages

1. **/ (Deck)** — table/grid of all nouns
   - Columns: article, noun, plural, meanings, themes, due status
   - Search box, filter by theme(s), filter "due today"
   - Buttons: "Add noun", "Import list", "Start campaign"
   - Click a row → edit drawer with all fields editable (article select, plural, meanings list, examples list, themes multi-select with create-new)

2. **/import** — paste or upload a `.txt` list of nouns (one per line, optionally with article)
   - Preview table of parsed entries
   - "Auto-fill with AI" button → calls server function using Lovable AI Gateway. AI fills: article, plural, Italian meanings (array), and suggested themes. Example sentences stay empty for me to write.
   - I can edit any field inline before confirming "Save all"

3. **/campaign** — campaign setup
   - Choose mode: Flashcards (spaced repetition) or Quiz
   - Choose scope: All cards / Due today / By theme(s) / combine
   - Choose session size (e.g. 10, 20, 50, all)
   - "Start"

4. **/campaign/run** — active session
   - **Flashcards**: shows noun → flip → reveals article, plural, meanings, example. Rate: Again / Hard / Good / Easy. SRS updates `due_at`, `interval_days`, `ease` (SM-2 algorithm).
   - **Quiz**: rotates question types per card:
     - Pick the article (der/die/das)
     - Type the plural
     - Translate to Italian (typed, accepts any of the stored meanings)
     - Translate Italian → German noun
   - End-of-session summary: correct/incorrect, time, cards reviewed, next due dates

### Add / edit noun form

Fields with the exact structure requested:
- Article (radio: Der / Die / Das)
- Noun (text)
- Plural (text)
- Meanings (chip input — add multiple Italian translations)
- Examples (textarea list — add multiple German sentences)
- Themes (multi-select with free-text create)
- "Auto-fill missing fields with AI" button on this form too

### AI auto-fill (server function)

Server function `autofillNoun({ noun })` calls Lovable AI Gateway (Gemini Flash) with a structured JSON schema returning `{ article, plural, meanings: string[], suggestedThemes: string[] }`. Used by import flow and the edit form. Examples are never AI-generated per your spec.

### Tech notes

- TanStack Start + Lovable Cloud (Postgres). Deck filters live in URL search params so links/back-button work.
- SRS: SM-2 with `again/hard/good/easy` mapping.
- Quiz answer matching: case-insensitive, trim, ignore articles, accept any meaning in the list.
- Theme list derived from existing `themes` arrays (distinct values) for filter dropdowns and chip suggestions.

### Out of scope (for now)
- Verbs, adjectives, adverbs (same pattern — easy to add later)
- Login / multi-user
- Audio pronunciation
