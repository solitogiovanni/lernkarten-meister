import { createFileRoute } from "@tanstack/react-router";
import { WordImportPage } from "@/components/WordImportPage";

export const Route = createFileRoute("/import/adjectives")({
  head: () => ({
    meta: [{ title: "Import adjectives — Wortschatz" }],
  }),
  component: () => (
    <WordImportPage
      kind="adjective"
      title="Import adjectives"
      hint="One per line. Format: adjective = meaning1, meaning2"
      placeholder={"schön = bello\ngroß = grande, alto\nschnell = veloce"}
    />
  ),
});
