import { createFileRoute } from "@tanstack/react-router";
import { WordDeckPage } from "@/components/WordDeckPage";

export const Route = createFileRoute("/prepositions")({
  head: () => ({ meta: [{ title: "Prepositions — Wortschatz" }] }),
  component: () => (
    <WordDeckPage
      kind="preposition"
      title="Your preposition deck"
      importTo="/import/prepositions"
      formLabel="Preposition"
      formPlaceholder="auf"
      addLabel="Add preposition"
    />
  ),
});
