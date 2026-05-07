import { createFileRoute } from "@tanstack/react-router";
import { WordImportPage } from "@/components/WordImportPage";

export const Route = createFileRoute("/import/adverbs")({
  head: () => ({
    meta: [{ title: "Import adverbs — Wortschatz" }],
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
