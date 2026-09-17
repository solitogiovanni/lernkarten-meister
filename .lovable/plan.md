# Edit panels: nearly full width on mobile, action buttons moved left

## Goal
1. On a smartphone, the edit panel (drawer) should span almost the whole screen width instead of 75%.
2. On every device, the action buttons at the bottom of an edit panel (Cancel / Save / Save & close / Add) sit on the left, right next to the AI fill button, so they no longer overlap the Lovable badge in the bottom-right corner.

## Current state (verified)
- Edit panels are side drawers (`SheetContent`, slides from the right). The base style in `src/components/ui/sheet.tsx` sets mobile width to `w-3/4`; usages override only the `sm:` max width (`sm:max-w-lg` / `sm:max-w-xl`).
- Edit drawers: nouns (`src/routes/index.tsx`), verbs (`src/routes/verbs.tsx`), word decks (`src/components/WordDeckPage.tsx`), grammar (`src/routes/grammar.tsx`) — each has an edit and an add drawer.
- Campaign / auto-detect edit panels are dialogs: `src/components/CardEditDialog.tsx` and `src/components/DraftEditDialog.tsx` (footer: AI fill left, Cancel + Save right on `sm+`).
- Drawer footers currently use `justify-between` (Delete left, AI fill + Save right) or `justify-end` (add drawers), pushing buttons into the badge area.

## Changes

### 1. Mobile width of edit drawers
In `src/components/ui/sheet.tsx`, change the `right` side variant base width from `w-3/4` to `w-[95vw]`. The existing `sm:max-w-lg` / `sm:max-w-xl` overrides keep the current widths on tablet/desktop. This widens all deck edit/add drawers at once.

### 2. Action buttons to the left (all devices)
- `CardEditDialog.tsx` and `DraftEditDialog.tsx`: footer becomes a single left-aligned row on all screen sizes (`flex-row justify-start gap-2`), order: AI fill, Cancel, Save.
- Edit drawers in `index.tsx`, `verbs.tsx`, `WordDeckPage.tsx`, `grammar.tsx`: footer row `justify-between` → `justify-start`, so Delete, AI fill, Save (and Save & close for grammar) all sit together on the left.
- Add drawers in the same files: `justify-end` → `justify-start` (AI fill + Add on the left) for the same consistency.
- `CardReveal.tsx` preview dialog footer: move Edit next to Close on the left (`justify-start`) so its bottom-right button also clears the badge.

## Verification
- Typecheck and build pass.
- Playwright at mobile viewport (390px): open a card's edit drawer — it spans ~95% of the screen; buttons sit bottom-left, clear of the badge. Desktop (1280px): drawer width unchanged, buttons left-aligned.
