# Always show your 5 latest themes everywhere

## Problem
The "latest themes" list is currently guessed from the newest cards, and themes you just typed are only remembered in the open page. The edit panel also mixes in its own deck-specific list, so it shows different themes than the quick-themes row on the card preview.

## What changes
- A single, saved list of your 5 most recent themes, shared by every word type (nouns, verbs, adjectives, adverbs, prepositions, pronouns, conjunctions).
- A theme goes to the top of that list whenever you create it or apply it: typing it in the edit/add panel, saving a card, quick-themes on the card preview, or the theme row in Auto-detect.
- The same 5 themes appear in: the card preview (quick themes), the edit panel, the add panel, Auto-detect results and the campaign edit dialog.
- The list survives reloads and works across laptop and phone.

## Technical details
- New table `recent_themes (theme text primary key, used_at timestamptz)` with grants + public RLS policies matching existing tables; seed it from current card themes ordered by card `updated_at`.
- `src/lib/themeStore.ts`: load recent from `recent_themes` (order by `used_at desc`, limit 5); `registerThemes()` updates memory immediately and upserts `used_at = now()`; keep `all` loaded from card tables.
- `NounForm`, `VerbForm`, `WordForm`: use only `global.recentThemes` for the "recent" part (drop the per-deck `recentThemes` prop merge) so ordering is identical everywhere.
- `CardReveal`, `AutoDetectDialog`, `cardThemes.ts`: already use the store; ensure save paths call `registerThemes` for themes on saved cards.
