import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/supabase-fetch";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { isDue } from "@/lib/srs";
import { Loader2, Play } from "lucide-react";

export const Route = createFileRoute("/campaign")({
  head: () => ({
    meta: [{ title: "Campaign — Wortschatz" }, { name: "description", content: "Set up a memorization session." }],
  }),
  component: CampaignSetup,
});

type Item = { kind: "noun" | "adjective" | "adverb" | "verb"; themes: string[]; due_at: string };

function CampaignSetup() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"flashcards" | "quiz">("flashcards");
  const [direction, setDirection] = useState<"de2it" | "it2de" | "mixed">("de2it");
  const [scope, setScope] = useState<"all" | "due">("due");
  const [kinds, setKinds] = useState<Set<"noun" | "adjective" | "adverb" | "verb">>(new Set(["noun", "adjective", "adverb", "verb"]));
  const [themes, setThemes] = useState<string[]>([]);
  const [themeFilter, setThemeFilter] = useState("");
  const [size, setSize] = useState<number>(20);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const [nounsRes, wordsRes, verbsRes] = await Promise.all([
        supabase.from("nouns").select("themes,due_at").limit(2000),
        (supabase as any).from("words").select("kind,themes,due_at").limit(2000),
        (supabase as any).from("verbs").select("themes,due_at").limit(2000),
      ]);
      const all: Item[] = [
        ...((nounsRes.data ?? []) as { themes: string[]; due_at: string }[]).map((r) => ({ kind: "noun" as const, themes: r.themes, due_at: r.due_at })),
        ...((wordsRes.data ?? []) as { kind: "adjective" | "adverb"; themes: string[]; due_at: string }[]).map((r) => ({ kind: r.kind, themes: r.themes, due_at: r.due_at })),
        ...((verbsRes.data ?? []) as { themes: string[]; due_at: string }[]).map((r) => ({ kind: "verb" as const, themes: r.themes, due_at: r.due_at })),
      ];
      setItems(all);
      setLoading(false);
    })();
  }, []);

  const allThemes = useMemo(() => {
    const set = new Set<string>();
    for (const r of items) if (kinds.has(r.kind)) for (const t of r.themes) set.add(t);
    return Array.from(set).sort();
  }, [items, kinds]);

  const matching = useMemo(() => {
    return items.filter((r) => {
      if (!kinds.has(r.kind)) return false;
      if (scope === "due" && !isDue(r.due_at)) return false;
      if (themes.length > 0 && !r.themes.some((t) => themes.includes(t))) return false;
      return true;
    });
  }, [items, kinds, scope, themes]);

  const sizes = [10, 20, 50];

  const toggleKind = (k: "noun" | "adjective" | "adverb" | "verb") => {
    const next = new Set(kinds);
    if (next.has(k)) {
      if (next.size === 1) return;
      next.delete(k);
    } else {
      next.add(k);
    }
    setKinds(next);
  };

  const start = () => {
    const limit = size === -1 ? matching.length : Math.min(size, matching.length);
    if (limit === 0) return;
    navigate({
      to: "/campaign/run",
      search: {
        mode,
        scope,
        themes: themes.join(","),
        limit,
        direction: mode === "flashcards" ? direction : "de2it",
        kinds: Array.from(kinds).join(","),
      },
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );

  const kindLabel = { noun: "Nouns", adjective: "Adjectives", adverb: "Adverbs", verb: "Verbs" } as const;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Start a campaign</h1>
        <p className="text-sm text-muted-foreground">Pick how you want to study and what to study.</p>
      </div>

      <Card className="p-4">
        <Label className="mb-2 block">Include</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["noun", "adjective", "adverb", "verb"] as const).map((k) => (
            <Button key={k} size="sm" variant={kinds.has(k) ? "default" : "outline"} onClick={() => toggleKind(k)}>
              {kindLabel[k]}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <Label className="mb-2 block">Mode</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={mode === "flashcards" ? "default" : "outline"} onClick={() => setMode("flashcards")}>
            Flashcards (SRS)
          </Button>
          <Button variant={mode === "quiz" ? "default" : "outline"} onClick={() => setMode("quiz")}>
            Quiz
          </Button>
        </div>
        {mode === "flashcards" && (
          <div className="mt-4">
            <Label className="mb-2 block text-sm text-muted-foreground">Direction</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant={direction === "de2it" ? "default" : "outline"} onClick={() => setDirection("de2it")}>DE → IT</Button>
              <Button size="sm" variant={direction === "it2de" ? "default" : "outline"} onClick={() => setDirection("it2de")}>IT → DE</Button>
              <Button size="sm" variant={direction === "mixed" ? "default" : "outline"} onClick={() => setDirection("mixed")}>Mixed</Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <Label className="mb-2 block">Scope</Label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button variant={scope === "due" ? "default" : "outline"} onClick={() => setScope("due")}>Due today</Button>
          <Button variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>All cards</Button>
        </div>

        {allThemes.length > 0 && (
          <details className="group">
            <summary className="text-sm text-muted-foreground cursor-pointer select-none hover:text-foreground inline-flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
              Themes (optional){themes.length > 0 && <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-primary text-primary-foreground">{themes.length}</span>}
            </summary>
            <Input
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value)}
              placeholder="Filter themes…"
              className="mt-2 h-8 text-sm"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {allThemes.filter((t) => t.toLowerCase().includes(themeFilter.toLowerCase())).map((t) => {
                const on = themes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => setThemes(on ? themes.filter((x) => x !== t) : [...themes, t])}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      on ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </details>
        )}
      </Card>

      <Card className="p-4">
        <Label className="mb-2 block">Session size</Label>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((s) => (
            <Button key={s} variant={size === s ? "default" : "outline"} onClick={() => setSize(s)}>{s}</Button>
          ))}
          <Button variant={size === -1 ? "default" : "outline"} onClick={() => setSize(-1)}>All</Button>
        </div>
      </Card>

      <div className="flex items-center justify-between border-t pt-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Will study </span>
          <span className="font-semibold">{Math.min(size === -1 ? matching.length : size, matching.length)}</span>
          <span className="text-muted-foreground"> of {matching.length} matching cards</span>
        </div>
        <Button onClick={start} disabled={matching.length === 0} size="lg">
          <Play className="h-4 w-4 mr-1" /> Start
        </Button>
      </div>
    </div>
  );
}
