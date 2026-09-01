# Keep the search active after editing an item

Today, editing a card found through search and saving it can drop you back into the full,
unfiltered deck. This happens whenever the edit takes you to a different deck than the one you
searched from, or when a save triggers a page reload — the search text lives only in the page you
left, so the new page starts empty.

## What changes

- When you open a card from the "Other matches" section and press Edit, the search term travels
  with you: the target deck (adjectives, verbs, nouns, ...) opens already filtered by the same
  text, with the edit panel open.
- The same applies to the "Add as ..." buttons and to items saved through "Auto-detect type":
  after saving you stay on the filtered list instead of the whole deck.
- Saving or deleting from the edit panel in the deck you are already in keeps the search box
  content untouched (unchanged behaviour on the nouns deck, fixed where a reload was involved).
- The "Clear" button remains the only way to drop the search.

## Technical notes

- `src/components/CrossDeckSearch.tsx`: include the current term in the `ADD_PREFILL_KEY` /
  `EDIT_PREFILL_KEY` session payloads (`{ kind, id | word, q }`), and replace the
  `window.location.reload()` in `AutoDetectDialog`'s `onSaved` with a data refresh callback that
  preserves the current filter state.
- `src/routes/index.tsx`: the query is already a URL search param; when consuming
  `EDIT_PREFILL_KEY` / `ADD_PREFILL_KEY` with a `q`, push it into the route search so the deck
  arrives pre-filtered.
- `src/routes/verbs.tsx` and `src/components/WordDeckPage.tsx`: `q` is local `useState`; in the
  existing prefill effects, call `setQ(p.q)` when the payload carries one. No change to the save
  handlers themselves (they already only call `load()`).
- `src/components/AutoDetectDialog.tsx`: expose the saved rows/refresh through `onSaved` so the
  parent deck can reload instead of reloading the browser page.
