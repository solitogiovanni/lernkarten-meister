import { createFileRoute } from "@tanstack/react-router";
import { WordDeckPage } from "@/components/WordDeckPage";

export const Route = createFileRoute("/conjunctions")({
  head: () => ({ meta: [{ title: "Conjunctions — Wortschatz" },
      { name: "description", content: "Your German conjunctions deck in Wortschatz." },
      { property: "og:title", content: "Conjunctions — Wortschatz" },
      { property: "og:description", content: "Your German conjunctions deck in Wortschatz." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }] }),
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
