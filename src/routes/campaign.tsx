import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { isDue } from "@/lib/srs";
import { Loader2, Play } from "lucide-react";

export const Route = createFileRoute("/campaign")({
  head: () => ({
    meta: [{ title: "Campaign — Wortschatz" }, { name: "description", content: "Set up a memorization session." }],
  }),
  component: CampaignSetup,
});

type Row = { id: string; themes: string[]; due_at: string };

function CampaignSetup() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"flashcards" | "quiz">("flashcards");
  const [direction, setDirection] = useState<"de2it" | "it2de" | "mixed">("de2it");
  const [scope, setScope] = useState<"all" | "due">("due");
  const [themes, setThemes] = useState<string[]>([]);
  const [size, setSize] = useState<number>(20);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("nouns")
      .select("id,themes,due_at")
      .limit(2000)
      .then(({ data }) => {
        setRows((data ?? []) as Row[]);
        setLoading(false);
      });
  }, []);

  const allThemes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const t of r.themes) set.add(t);
    return Array.from(set).sort();
  }, [rows]);

  const matching = useMemo(() => {
    return rows.filter((r) => {
      if (scope === "due" && !isDue(r.due_at)) return false;
      if (themes.length > 0 && !r.themes.some((t) => themes.includes(t))) return false;
      return true;
    });
  }, [rows, scope, themes]);

  const sizes = [10, 20, 50];

  const start = () => {
    const limit = size === -1 ? matching.length : Math.min(size, matching.length);
    if (limit === 0) return;
    navigate({
      to: "/campaign/run",
      search: { mode, scope, themes: themes.join(","), limit },
    });
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Start a campaign</h1>
        <p className="text-sm text-muted-foreground">Pick how you want to study and what to study.</p>
      </div>

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
      </Card>

      <Card className="p-4">
        <Label className="mb-2 block">Scope</Label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button variant={scope === "due" ? "default" : "outline"} onClick={() => setScope("due")}>
            Due today
          </Button>
          <Button variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>
            All cards
          </Button>
        </div>

        {allThemes.length > 0 && (
          <>
            <Label className="mb-2 block text-sm text-muted-foreground">Themes (optional)</Label>
            <div className="flex flex-wrap gap-1.5">
              {allThemes.map((t) => {
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
          </>
        )}
      </Card>

      <Card className="p-4">
        <Label className="mb-2 block">Session size</Label>
        <div className="grid grid-cols-4 gap-2">
          {sizes.map((s) => (
            <Button key={s} variant={size === s ? "default" : "outline"} onClick={() => setSize(s)}>
              {s}
            </Button>
          ))}
          <Button variant={size === -1 ? "default" : "outline"} onClick={() => setSize(-1)}>
            All
          </Button>
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
