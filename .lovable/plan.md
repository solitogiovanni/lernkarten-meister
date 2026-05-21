## Fix: Save conjugation field in campaign verb edit

**Bug**: In `src/components/CardEditDialog.tsx`, the verb `save()` builds a payload that omits `conjugation` (lines 184-193) and the resulting `next` EditableCard also omits it (lines 200-209). So even though AI fill populates the field in state, the UPDATE/INSERT never writes it.

## Change

Edit **`src/components/CardEditDialog.tsx`** only:
1. Add `conjugation: verb.conjugation.trim() || null` to the verb `payload` object.
2. Add `conjugation: payload.conjugation` to the `next` object in the non-kindChanged branch.
3. Add `conjugation: data.conjugation` to the `next` object in the kindChanged branch.

No schema, server-fn, or other file changes required.