# Auto-detect: apply recent themes to the selected results

Add a themes row to the auto-detect result panel so themes can be applied without opening each result.

## Behaviour

- Above the result list, a "Apply themes" row shows the most recently used themes (same list the
  add/edit panels suggest), plus a small search box to filter down to any existing theme and a way to
  type a brand-new theme.
- Tapping a theme highlights it and immediately adds it to every ticked result; tapping it again
  removes it from those results.
- Results ticked after a theme was chosen also receive the chosen themes, so order doesn't matter.
- Themes added inside a result's own Edit panel are kept; this row only adds or removes the themes
  picked here.
- Each result card shows its current themes as small chips so it's visible what will be saved.
- Saving is unchanged: for a new card the themes are stored; for a card that already exists the
  themes are merged into the existing ones (no duplicates), as today.

## Technical notes

- `src/components/AutoDetectDialog.tsx`: read suggestions via `useGlobalThemes()` from
  `src/lib/themeStore.ts` (recent first, then alphabetical, filtered by the search text).
  Keep `selectedThemes: string[]` state; toggling one patches `themes` on every draft with
  `include: true` (union on add, filter on remove). When a draft's checkbox is turned on, union the
  currently selected themes into its `themes`. New themes typed here go through `registerThemes()`
  so they show up everywhere immediately.
- Render per-card theme chips in the existing card body; no change to `payloadFor` / `mergeRow` /
  `saveAll` logic.
