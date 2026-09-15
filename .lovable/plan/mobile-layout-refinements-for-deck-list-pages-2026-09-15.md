# Mobile layout refinements for deck list pages

## Goal
Make the deck list pages easier to use on a smartphone by simplifying the sticky header, enlarging the search field, and cleaning up the bottom "add" area.

## Scope
Apply the same responsive mobile changes to every deck list page:
- `/` (Nouns)
- `/verbs`
- `/adjectives`, `/adverbs`, `/prepositions`, `/pronouns`, `/conjunctions` (via `WordDeckPage`)
- `/grammar`

## Changes

### 1. Sticky header — mobile-only simplification
On screens below `sm`:
- Hide the **Import** and **Due today** buttons.
- Keep the **Campaign** button visible (it is the main action), but allow it to shrink/iconify if space is tight.
- Shrink the "Add noun / Add verb / Add rule" button:
  - Use an icon-only `Plus` button with an `aria-label`, or keep a very short label such as "Add".
- Make the search input the dominant element:
  - Full width of the row.
  - Slightly larger tap target (`h-11` or `text-base` to avoid iOS zoom).
- Preserve all buttons on `sm` and larger screens.

### 2. Search row layout
- Stack the search input and the remaining actions vertically on mobile so the search field can be full-width without wrapping.
- Keep the "Clear" filter button only when a filter is active; it can sit next to the search field or just below it on mobile.

### 3. Themes area
- Keep the collapsible Themes section unchanged functionally.
- Ensure the theme filter input and badges do not push the search field off-screen.

### 4. Bottom "add" area in `CrossDeckSearch`
- On mobile, hide the individual **Add as noun / verb / adjective / adverb** buttons.
- Replace them with a single, large, full-width **Auto-detect type** button (the Sparkles action).
- On `sm+`, keep the current layout with all "Add as..." options plus Auto-detect.
- The Auto-detect behavior and the dialog it opens remain unchanged.

### 5. Grammar page
- Apply the same mobile header simplification: smaller Add button, larger search field.
- Grammar has no Import, Campaign, or Due today buttons, so only the Add button and search field need adjustment.

## Verification
- Switch the preview to mobile viewport and confirm:
  - Import / Due today are hidden on the noun/verb/word decks.
  - Add button is compact.
  - Search field is clearly larger and easy to tap.
  - When no match is found, only a large Auto-detect button is shown at the bottom.
- Confirm desktop/tablet layout is unchanged.
- Run typecheck and build.
