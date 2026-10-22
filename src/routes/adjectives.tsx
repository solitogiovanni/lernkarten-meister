import { createFileRoute } from "@tanstack/react-router";
import { WordDeckPage } from "@/components/WordDeckPage";

export const Route = createFileRoute("/adjectives")({
  head: () => ({
    meta: [
      { title: "Adjectives — Wortschatz" },
      { property: "og:title", content: "Adjectives — Wortschatz" },
      { property: "og:description", content: "Your German adjective deck." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Your German adjective deck." },
    ],
  }),
  component: AdjectivesPage,
});

function AdjectivesPage() {
  return (
    <WordDeckPage
      kind="adjective"
      title="Your adjective deck"
      importTo="/import/adjectives"
      formLabel="Adjective"
      formPlaceholder="schön"
      addLabel="Add adjective"
    />
  );
}
