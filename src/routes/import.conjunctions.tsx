import { createFileRoute } from "@tanstack/react-router";
import { WordImportPage } from "@/components/WordImportPage";

export const Route = createFileRoute("/import/conjunctions")({
  head: () => ({ meta: [{ title: "Import conjunctions — Wortschatz" },
      { name: "description", content: "Import German conjunctions into your Wortschatz collection." },
      { property: "og:title", content: "Import conjunctions — Wortschatz" },
      { property: "og:description", content: "Import German conjunctions into your Wortschatz collection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <WordImportPage
      kind="conjunction"
      title="Import conjunctions"
      hint="One per line. Format: conjunction = meaning1, meaning2"
      placeholder={"und = e\naber = ma\nweil = perché"}
    />
  ),
});
