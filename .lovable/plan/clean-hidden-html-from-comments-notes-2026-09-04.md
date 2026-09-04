# Clean hidden HTML from comments/notes

## Problem
When pasting text from web pages or Word into the Comments field (and Grammar notes), the clipboard HTML often carries hidden junk: `<style>`/`<script>` blocks, HTML comments, `display:none` spans, meta/link tags, and Office (`mso-*) markup. Some of this hidden content becomes visible when the card is later displayed.

## Fix
Add a "Clean HTML" button to the RichTextEditor toolbar (used by Comments in all card forms and by Notes in the Grammar tab — one shared component, so all places get it automatically).

### Changes in `src/components/RichTextEditor.tsx`
1. New `cleanHtml()` function that sanitizes the current editor content in place:
   - Parse `ref.current.innerHTML` with `DOMParser`.
   - Remove `<style>`, `<script>`, `<link>`, `<meta>`, `<title>`, `<xml>` tags and HTML comment nodes.
   - Remove elements that are hidden: `display:none`, `visibility:hidden`, `font-size:0`, `mso-hide:all`, `hidden` attribute, `aria-hidden="true"`.
   - Strip all `class` attributes and `mso-*` / Office namespace attributes.
   - Keep visible text and supported formatting (bold/italic/underline, colors, highlights, lists, images).
   - Write the cleaned HTML back into the editor and call `onChange`.
2. Add a toolbar button (broom/`Paintbrush`-style icon, e.g. Lucide `BrushCleaning` or `SprayCan`) titled "Remove hidden HTML / clean pasted code" next to the existing "Clear formatting" eraser button.
3. Optionally also clean on paste: keep the existing paste behavior, but the button gives manual control as requested.

## Notes
- No database or route changes — `RichTextEditor` is shared by NounForm, VerbForm, WordForm, CardEditDialog, DraftEditDialog, and the Grammar page, so one change covers Comments everywhere plus Grammar notes.
