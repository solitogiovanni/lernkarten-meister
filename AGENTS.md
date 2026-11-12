# Project conventions

- Keep pronunciation in the shared browser-only `src/lib/pronunciation.ts` helper and call it synchronously from the user's tap; this preserves Safari user activation across all card views.
- "Confused with" links live in each card's `confused_with` jsonb and are edited in-place by `ConfusedWithPanel` (preview + campaign); keeps them out of every form payload.
- Merge confusion groups through the shared `confusionGroups` helper, traversing links from both endpoints before synchronizing all members; linking must work regardless of which card initiates it.
