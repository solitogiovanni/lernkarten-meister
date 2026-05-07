import { createFileRoute } from "@tanstack/react-router";
import { WordDeckPage } from "@/components/WordDeckPage";

export const Route = createFileRoute("/adjectives")({
  head: () => ({
    meta: [
      { title: "Adjectives — Wortschatz" },
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
