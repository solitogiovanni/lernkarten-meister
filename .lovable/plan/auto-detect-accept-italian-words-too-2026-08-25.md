# Auto-detect: accept Italian words too

Today the auto-detect button assumes the typed word is German. If you type an Italian word
(e.g. "fiume"), the result is meaningless. This change makes auto-detect recognise the input
language and, for Italian input, propose the German translation(s) as ready-to-save cards.

## Behaviour

- Type a German word: unchanged behaviour (all plausible parts of speech).
- Type an Italian word: the AI returns the best German translation(s) — up to 3 — each as a
  complete card of the right type (noun with article/plural, verb with conjugations, etc.),
  with the Italian input kept among the meanings.
- An ambiguous Italian word with several distinct German equivalents (e.g. "tempo" → "die Zeit",
  "das Wetter") produces one candidate per equivalent, so you can tick the ones you want.
- Words that exist in both languages are treated as German first, with Italian candidates listed after.
- Each candidate card shows the German headword, so it is clear a translation happened.

## Technical notes

- `detectWordKinds` in `src/lib/autofill.functions.ts`: extend the system prompt to first decide whether
  the input is German or Italian, and in the Italian case to translate before classifying. Add a
  `source` field ("german" | "italian-translation") to each returned item in the tool schema, and
  make sure the Italian input ends up in `meanings`.
- The tool schema's `kind` enum is currently limited to noun/verb/adjective/adverb; widen it to the full
  set (preposition, pronoun, conjunction) so translations of those types work as well.
- `src/components/AutoDetectDialog.tsx`: when an item is a translation, show a small "translated from
  Italian" badge next to the type chip. Saving logic is unchanged.
