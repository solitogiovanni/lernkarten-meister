import { createFileRoute } from "@tanstack/react-router";
import { WordDeckPage } from "@/components/WordDeckPage";

export const Route = createFileRoute("/pronouns")({
  head: () => ({ meta: [{ title: "Pronouns — Wortschatz" }] }),
  component: () => (
    <WordDeckPage
      kind="pronoun"
      title="Your pronoun deck"
      importTo="/import/pronouns"
      formLabel="Pronoun"
      formPlaceholder="ich"
      addLabel="Add pronoun"
    />
  ),
});
