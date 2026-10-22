import { createFileRoute } from "@tanstack/react-router";
import { WordImportPage } from "@/components/WordImportPage";

export const Route = createFileRoute("/import/pronouns")({
  head: () => ({ meta: [{ title: "Import pronouns — Wortschatz" },
      { name: "description", content: "Import German pronouns into your Wortschatz collection." },
      { property: "og:title", content: "Import pronouns — Wortschatz" },
      { property: "og:description", content: "Import German pronouns into your Wortschatz collection." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <WordImportPage
      kind="pronoun"
      title="Import pronouns"
      hint="One per line. Format: pronoun = meaning1, meaning2"
      placeholder={"ich = io\ndu = tu\nwir = noi"}
    />
  ),
});
