# Quick-apply recent themes from the card preview

When you tap an item and its preview card opens, add a small row of your most recent themes so a
theme can be applied (or removed) with one tap, without opening the edit panel.

## Behaviour

- Inside the preview card, just above the existing theme badges, a "Quick themes" row shows the
  most recently used themes (the same global list used by the edit panels).
- A theme the card already has is shown highlighted; tapping it removes it from the card. Tapping
  a theme the card doesn't have adds it. The change is saved to the card immediately and the
  preview updates on the spot.
- A theme applied this way instantly joins the "recent themes" list, so it stays on top for the
  next cards — consistent with how themes behave everywhere else.
- Works from every place the preview card can open: the deck lists (nouns, verbs, adjectives,
  adverbs, prepositions, pronouns, conjunctions), the search results, and the "Other words with
  these themes" section.

## Technical notes

- `src/components/CardReveal.tsx`: add optional props `id?: string` and
  `onToggleTheme?: (theme: string, add: boolean) => void`. When both are present, render the
  quick-themes row using `useGlobalThemes()` from `src/lib/themeStore` (recent first); highlight
  themes already in `card.themes`.
- Call sites pass the row id plus a handler that updates the correct table
  (`nouns` / `verbs` / `words`), refreshes the local item list, calls `registerThemes()`, and
  updates the open preview's `themes` so the highlight flips immediately:
  - `src/routes/index.tsx` (nouns), `src/routes/verbs.tsx`, `src/components/WordDeckPage.tsx`
    (generic word kinds) — they preview full rows that already carry the id.
  - `src/components/CrossDeckSearch.tsx` and `src/components/CrossDeckThemes.tsx` — their preview
    state already stores `{ card, kind, id }`; the handler picks the table from `kind`.
- On save failure, show the existing error toast and leave the card unchanged.
