import { createFileRoute } from "@tanstack/react-router";
import { WordDeckPage } from "@/components/WordDeckPage";

export const Route = createFileRoute("/adverbs")({
  head: () => ({
    meta: [
      { title: "Adverbs — Wortschatz" },
      { name: "description", content: "Your German adverb deck." },
    ],
  }),
  component: AdverbsPage,
});

function AdverbsPage() {
  return (
    <WordDeckPage
      kind="adverb"
      title="Your adverb deck"
      importTo="/import/adverbs"
      formLabel="Adverb"
      formPlaceholder="schnell"
      addLabel="Add adverb"
    />
  );
}
