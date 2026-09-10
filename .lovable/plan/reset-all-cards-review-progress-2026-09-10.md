# Reset all cards' review progress

Clear the "due today" state everywhere by resetting every card back to a brand-new, never-studied state.

## What changes

For every card in Nouns, Verbs, and all word decks (adjectives, adverbs, prepositions, pronouns, conjunctions):

- Repetitions back to 0
- Lapses back to 0
- Ease back to the default 2.5
- Interval back to 0
- Last rated date cleared
- Due date set to now, so cards behave exactly like freshly added ones

Card content (words, meanings, examples, themes, synonyms, opposites, comments) is untouched.

## Note

Setting the due date to now means all cards are again available for study immediately — that is the normal state of a new card in this app. If you instead want nothing to appear as due today, say so and the due date can be pushed to tomorrow instead.

## Technical detail

One data update run against the database:

```sql
UPDATE public.nouns SET ease = 2.5, interval_days = 0, reps = 0, lapses = 0,
  last_rated_at = NULL, due_at = now();
-- same for public.verbs and public.words
```

No schema or code changes.
