# Project conventions

- Keep pronunciation in the shared browser-only `src/lib/pronunciation.ts` helper and call it synchronously from the user's tap; this preserves Safari user activation across all card views.