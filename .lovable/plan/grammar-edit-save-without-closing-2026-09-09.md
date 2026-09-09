# Grammar edit: save without closing

## Goal
In the Grammar tab, when editing a card, add a way to save the current changes while keeping the edit sheet open, so the user can continue editing.

## Current state
- `src/routes/grammar.tsx` has a single "Save" button in the edit sheet.
- Clicking "Save" calls `saveEdit()`, persists the row, shows a toast, closes the sheet (`setEditing(null)`), and reloads the list.
- There is no intermediate "save but stay open" action.

## Changes
1. Add a second button in the edit sheet footer: "Save" (keeps the sheet open) and "Save & close" (current behavior).
2. Refactor `saveEdit` to accept an optional `close: boolean` parameter.
   - If `close` is false: update the row, refresh the list, keep `editing` and `editValue` as-is, show toast.
   - If `close` is true (default): update the row, refresh the list, close the sheet, show toast.
3. Keep the Delete button on the left side of the footer unchanged.
4. Ensure the in-sheet form state is not reset when saving without closing.

## Files to modify
- `src/routes/grammar.tsx`

## UI placement
Edit sheet footer, left to right:
- Delete button (left)
- Spacer
- "Save" button (keeps open)
- "Save & close" button (primary/outline variant, closes sheet)
