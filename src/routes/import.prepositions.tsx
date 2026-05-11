import { createFileRoute } from "@tanstack/react-router";
import { WordImportPage } from "@/components/WordImportPage";

export const Route = createFileRoute("/import/prepositions")({
  head: () => ({ meta: [{ title: "Import prepositions — Wortschatz" }] }),
  component: () => (
    <WordImportPage
      kind="preposition"
      title="Import prepositions"
      hint="One per line. Format: preposition = meaning1, meaning2"
      placeholder={"auf = su\nmit = con\nohne = senza"}
    />
  ),
});
