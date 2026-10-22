import { createFileRoute } from "@tanstack/react-router";
import { WordImportPage } from "@/components/WordImportPage";

export const Route = createFileRoute("/import/adjectives")({
  head: () => ({
    meta: [{ title: "Import adjectives — Wortschatz" },
      { name: "description", content: "Import German adjectives into your Wortschatz collection." },
      { property: "og:title", content: "Import adjectives — Wortschatz" },
      { property: "og:description", content: "Import German adjectives into your Wortschatz collection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }],
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
