import { createFileRoute } from "@tanstack/react-router";
import { WordDeckPage } from "@/components/WordDeckPage";

export const Route = createFileRoute("/prepositions")({
  head: () => ({ meta: [{ title: "Prepositions — Wortschatz" },
      { name: "description", content: "Your German prepositions deck in Wortschatz." },
      { property: "og:title", content: "Prepositions — Wortschatz" },
      { property: "og:description", content: "Your German prepositions deck in Wortschatz." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }] }),
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
