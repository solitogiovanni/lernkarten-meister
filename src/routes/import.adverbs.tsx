import { createFileRoute } from "@tanstack/react-router";
import { WordImportPage } from "@/components/WordImportPage";

export const Route = createFileRoute("/import/adverbs")({
  head: () => ({
    meta: [{ title: "Import adverbs — Wortschatz" },
      { name: "description", content: "Import German adverbs into your Wortschatz collection." },
      { property: "og:title", content: "Import adverbs — Wortschatz" },
      { property: "og:description", content: "Import German adverbs into your Wortschatz collection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }],
  }),
  component: () => (
    <WordImportPage
      kind="adverb"
      title="Import adverbs"
      hint="One per line. Format: adverb = meaning1, meaning2"
      placeholder={"heute = oggi\nimmer = sempre\nschnell = velocemente"}
    />
  ),
});
