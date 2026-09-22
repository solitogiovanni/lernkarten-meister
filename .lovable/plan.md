# Theme filter: match any theme or all themes

Add a small Any / All switch to the theme filter, so several selected themes can either widen the
list (any theme matches, as today) or narrow it (an item must carry all selected themes).

## Behaviour

- In the themes area of every deck page (Nouns, Verbs, Adjectives, Adverbs, Prepositions, Pronouns,
  Conjunctions), next to the selected-theme chips and "Clear all", a two-button switch appears:
  **Any** (default, current behaviour) and **All**.
- The switch only shows when two or more themes are selected, since with one theme both modes are
  identical.
- The mode applies to the deck list on the page and to the "Other words with these themes" section
  below, so both always agree.
- Default stays **Any** so nothing changes for existing use; the choice persists while staying on the
  page and is kept in the address of the Nouns page alongside the themes, so a reload keeps it.

## Technical notes

- `src/routes/index.tsx`: add a `mode` search param (`"any" | "all"`, default `"any"`) next to the
  existing comma-separated `theme` param; filter becomes `every` instead of `some` when `all`.
- `src/routes/verbs.tsx`, `src/components/WordDeckPage.tsx`: add `themeMode` state next to the
  existing `themes` state and switch `some`/`every` in the filter memo.
- Extract the switch as a tiny shared piece (e.g. `ThemeMatchToggle` in
  `src/components/CrossDeckThemes.tsx` or a new small file) so the three pages render the same
  control.
- `src/components/CrossDeckThemes.tsx`: accept `mode` prop; keep `.overlaps("themes", themes)` for
  `any` and use `.contains("themes", themes)` for `all` in the nouns/verbs/words queries.
