# Pictures on noun and verb cards

Every noun and verb card gets a picture that helps you remember the word. It shows on the card in the
deck list, when you open a card, and during a campaign.

## What you get

1. **Automatic picture with AI fill** — when you press AI fill on a single noun or verb card, a small
   colour illustration matching the word is created and attached to the card. If the card already has a
   picture, AI fill keeps it (a "Regenerate picture" button lets you replace it on purpose).
2. **Change the picture in edit mode** — the noun and verb edit panels get a picture box with:
   - a preview of the current picture and a Remove button,
   - **Upload** a file from your device,
   - **Paste a link** to an image on the web,
   - **Create from a keyword** — you type a word or short description and a new picture is made from it.
3. **Always visible** — a small thumbnail on each card in the deck list, and a larger picture when the
   card is opened or shown during a campaign (on the answer side).

Bulk actions (list import, unified import, auto-detect) do **not** create pictures — that would be slow
and expensive for long lists. Those cards start without a picture and you can add one later from edit
mode.

## Technical notes

- Migration: add `image_url text` to `public.nouns` and `public.verbs` (nullable, no other changes).
- Storage: create a public bucket `card-images` via the storage tool, with RLS policies on
  `storage.objects` allowing authenticated insert/update/delete and public select. Uploads and
  AI-generated images are stored there; pasted links are saved as-is.
- New server function `generateCardImage` in `src/lib/cardImage.functions.ts`: calls the AI gateway
  `/v1/images/generations` with `google/gemini-3-pro-image` (non-streaming, single image), prompt built
  from the German word plus its Italian meaning, asking for a simple colourful illustration on a plain
  background, no text. Returns base64; the client uploads it to `card-images` and stores the public URL.
  Gateway errors (402/429/4xx) are surfaced as a toast, never silently swallowed.
- `NounFormValue` / `VerbFormValue` gain `imageUrl: string | null`; a shared `ImagePicker` component
  (`src/components/ImagePicker.tsx`) provides preview, upload, link input and keyword generation, reused
  by `NounForm`, `VerbForm`, `CardEditDialog` and `DraftEditDialog`.
- AI-fill call sites for a single noun/verb (`src/routes/index.tsx`, `src/routes/verbs.tsx`,
  `CardEditDialog`) chain the image generation after the text autofill when `imageUrl` is empty.
- Display: `RevealCard` gains `imageUrl`; `CardReveal.tsx` renders it under the headword.
  `src/routes/index.tsx` and `src/routes/verbs.tsx` list rows render a rounded 40px thumbnail.
  `src/routes/campaign_.run.tsx` shows the picture on the revealed side of noun/verb flashcards.
- Insert/update payloads and the row types in the noun and verb routes carry `image_url`.
