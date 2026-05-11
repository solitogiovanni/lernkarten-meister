import { createFileRoute } from "@tanstack/react-router";
import { WordDeckPage } from "@/components/WordDeckPage";

export const Route = createFileRoute("/conjunctions")({
  head: () => ({ meta: [{ title: "Conjunctions — Wortschatz" }] }),
  component: () => (
    <WordDeckPage
      kind="conjunction"
      title="Your conjunction deck"
      importTo="/import/conjunctions"
      formLabel="Conjunction"
      formPlaceholder="und"
      addLabel="Add conjunction"
    />
  ),
});
