# Accent-insensitive search

Typing `Konig` should find `König`, and typing `König` should find `Konig`. Same for ä/ö/ü/ß (and `ae/oe/ue/ss` spellings), in every deck's search field and in the cross-deck "Other matches" results.

## What changes

1. **Shared text-folding helper** (`src/lib/normalize.ts`): a `fold()` function that lowercases and maps
   `ä→a, ö→o, ü→u, ß→ss`, plus the reverse-friendly forms `ae→a, oe→o, ue→u, ss→s`, and strips any other
   diacritics via Unicode NFD. So `König`, `Koenig` and `Konig` all fold to `konig`.

2. **Local deck filtering** (`src/routes/index.tsx`, `src/routes/verbs.tsx`, `src/components/WordDeckPage.tsx`):
   compare `fold(query)` against `fold(haystack)` instead of `toLowerCase()`. Covers word, plural, verb forms,
   meanings, and prepositions exactly as today — only the comparison changes.

3. **Cross-deck search** (`src/components/CrossDeckSearch.tsx` + database search functions):
   the current `ilike '%term%'` queries and the `search_*_by_meaning` functions are accent-sensitive.
   A migration replaces them with folded matching: both the stored text and the search term are pushed through
   the same normalization in SQL (lowercase + `translate`/replace of the umlaut and ß forms) before comparing,
   so results match the client behaviour. Meanings/synonyms arrays keep using `unnest` as today.

4. Theme filter chips get the same folding, for consistency.

## Notes

No schema or data changes — only search comparison logic. Existing behaviour (case-insensitivity, substring
matching, meaning search, dedupe) stays the same.
