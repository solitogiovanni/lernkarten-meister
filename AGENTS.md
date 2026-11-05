# Project conventions

- Keep pronunciation in the shared browser-only `src/lib/pronunciation.ts` helper and call it synchronously from the user's tap; this preserves Safari user activation across all card views.
- "Confused with" links live in each card's `confused_with` jsonb and are edited in-place by `ConfusedWithPanel` (preview + campaign); keeps them out of every form payload.
