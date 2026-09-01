# Auto-detect: edit a candidate before saving

Each candidate returned by "Auto-detect type" gets an **Edit** button next to its checkbox.
Pressing it opens the full card editor (the same forms used when adding a noun / verb / other
word) pre-filled with that candidate, so you can add examples, themes, synonyms, opposites,
comments, prepositions, etc. Closing the editor with **Done** returns to the auto-detect result
list with your changes applied to that candidate; **Cancel** discards them. Nothing is written to
the database until you press **Save** in the auto-detect dialog, so multi-result selections stay
intact.

## Behaviour

- Every result card shows: checkbox, type chip, the quick inline fields (unchanged), and an Edit button.
- Edit opens a sub-dialog on top of the auto-detect dialog:
  - noun -> `NounForm`, verb -> `VerbForm`, everything else -> `WordForm`.
  - It includes a **Type** selector, so a wrongly detected type can be corrected there too.
  - It has its own **AI fill** button, same as the campaign card editor.
- Done applies the edited values back into the candidate in the list; the checkbox stays ticked.
- Save (in the auto-detect dialog) persists all ticked candidates, including the extra fields
  entered in the editor (examples, themes, synonyms, antonyms, comments).

## Technical notes

- New component `src/components/DraftEditDialog.tsx`: an in-memory editor over a `MixedItem`
  draft. It reuses `NounForm` / `VerbForm` / `WordForm` and the `autofillNouns` / `autofillVerbs` /
  `autofillWords` server functions (same AI-fill logic as `CardEditDialog`), but performs no
  Supabase reads or writes — it calls `onSave(nextDraft)` and closes.
- `MixedItem` currently has no `comments` field; extend the draft type used by
  `AutoDetectDialog` with an optional `comments` string so the editor's comments box round-trips,
  and include `comments` in the insert payloads for nouns / verbs / words.
- `AutoDetectDialog.tsx`: add `editingIndex` state, the Edit button per card, and render
  `DraftEditDialog` when set; on save, patch that draft via the existing `updateDraft` helper.
  Existing detect, checkbox and `saveAll` logic is otherwise unchanged.
