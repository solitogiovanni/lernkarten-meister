import { createFileRoute } from "@tanstack/react-router";
import { WordDeckPage } from "@/components/WordDeckPage";

export const Route = createFileRoute("/pronouns")({
  head: () => ({ meta: [{ title: "Pronouns — Wortschatz" },
      { name: "description", content: "Your German pronouns deck in Wortschatz." },
      { property: "og:title", content: "Pronouns — Wortschatz" },
      { property: "og:description", content: "Your German pronouns deck in Wortschatz." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }] }),
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
