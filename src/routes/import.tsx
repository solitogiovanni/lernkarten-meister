import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, X, Check } from "lucide-react";
import { toast } from "sonner";
import { autofillNouns, type AutofilledNoun } from "@/server/autofill.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [{ title: "Import — Wortschatz" }, { name: "description", content: "Bulk import German nouns and let AI fill the gaps." }],
  }),
  component: ImportPage,
});

type Draft = AutofilledNoun & { include: boolean };

const articleColor = {
  der: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  die: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  das: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

function ImportPage() {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const autofillFn = useServerFn(autofillNouns);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("nouns")
      .select("noun")
      .limit(5000)
      .then(({ data }) => {
        setExisting(new Set((data ?? []).map((r) => r.noun.trim().toLowerCase())));
      });
  }, []);

  const isDuplicate = (noun: string, idx: number) => {
    const key = noun.trim().toLowerCase();
    if (!key) return false;
    if (existing.has(key)) return true;
    // duplicate within current drafts (earlier occurrence wins)
    return drafts.findIndex((d, i) => i < idx && d.noun.trim().toLowerCase() === key) !== -1;
  };

  type ParsedLine = {
    raw: string;
    article: "der" | "die" | "das" | null;
    noun: string;
    meanings: string[];
  };

  const parseLine = (line: string): ParsedLine => {
    const raw = line.trim();
    // Split off meanings after "=" or ":"
    const [leftRaw, ...rightParts] = raw.split(/\s*[=:]\s*/);
    const left = leftRaw.trim();
    const right = rightParts.join("=").trim();
    const meanings = right
      ? right.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean)
      : [];
    const m = left.match(/^(der|die|das)\s+(.+)$/i);
    if (m) {
      return { raw, article: m[1].toLowerCase() as "der" | "die" | "das", noun: m[2].trim(), meanings };
    }
    return { raw, article: null, noun: left, meanings };
  };

  const parsed: ParsedLine[] = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLine);

  const runAi = async () => {
    if (parsed.length === 0) return toast.error("Paste at least one noun");
    if (parsed.length > 50) return toast.error("Max 50 nouns at a time");
    setBusy(true);
    try {
      // Send only the German part to the AI
      const { results, error } = await autofillFn({
        data: { nouns: parsed.map((p) => (p.article ? `${p.article} ${p.noun}` : p.noun)) },
      });
      if (error) return toast.error(error);
      // Merge: user-provided meanings/article win
      const merged: Draft[] = parsed.map((p, i) => {
        const r = results[i];
        const noun = r?.noun || p.noun;
        const dupExisting = existing.has(noun.trim().toLowerCase());
        return {
          input: p.raw,
          noun,
          article: p.article ?? r?.article ?? null,
          plural: r?.plural ?? null,
          meanings: p.meanings.length ? p.meanings : r?.meanings ?? [],
          themes: r?.themes ?? [],
          include: !dupExisting,
        };
      });
      setDrafts(merged);
      toast.success(`AI filled ${merged.length} nouns`);
    } finally {
      setBusy(false);
    }
  };

  const skipAi = () => {
    setDrafts(
      parsed.map((p) => {
        const dupExisting = existing.has(p.noun.trim().toLowerCase());
        return {
          input: p.raw,
          noun: p.noun,
          article: p.article,
          plural: null,
          meanings: p.meanings,
          themes: [],
          include: !dupExisting,
        };
      })
    );
  };

  const updateDraft = (i: number, patch: Partial<Draft>) => {
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  const saveAll = async () => {
    const toInsert = drafts.filter((d, i) => d.include && d.noun.trim() && !isDuplicate(d.noun, i));
    if (toInsert.length === 0) return toast.error("Nothing to save");
    setSaving(true);
    const rows = toInsert.map((d) => ({
      article: d.article,
      noun: d.noun.trim(),
      plural: d.plural?.trim() || null,
      meanings: d.meanings,
      examples: [] as string[],
      themes: d.themes,
    }));
    const { error } = await supabase.from("nouns").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${rows.length} nouns`);
    navigate({ to: "/" });
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import nouns</h1>
        <p className="text-sm text-muted-foreground">
          One noun per line. Format: <code>article Noun = meaning1, meaning2</code> (article and meanings optional).
        </p>
      </div>

      {drafts.length === 0 ? (
        <Card className="p-4 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"der Tisch = tavolo\ndie Freundschaft = amicizia\nHaus = casa, edificio"}
            rows={12}
            className="font-mono text-sm"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{parsed.length} parsed</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={skipAi} disabled={parsed.length === 0}>
                Skip AI
              </Button>
              <Button onClick={runAi} disabled={busy || parsed.length === 0}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Auto-fill with AI
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-3">
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className="font-medium">{drafts.filter((d) => d.include).length}</span>
                <span className="text-muted-foreground"> of {drafts.length} selected</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDrafts([])}>
                  Start over
                </Button>
                <Button onClick={saveAll} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save all
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            {drafts.map((d, i) => {
              const dup = isDuplicate(d.noun, i);
              const dupExisting = existing.has(d.noun.trim().toLowerCase());
              return (
              <Card key={i} className={`p-3 ${!d.include ? "opacity-50" : ""} ${dup ? "border-amber-500/60 bg-amber-500/5" : ""}`}>
                {dup && (
                  <div className="text-xs text-amber-700 dark:text-amber-400 mb-2 font-medium">
                    ⚠ Duplicate — already {dupExisting ? "in your deck" : "above in this list"}
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => updateDraft(i, { include: !d.include })}
                    className={`mt-1 h-5 w-5 rounded border flex items-center justify-center ${
                      d.include ? "bg-primary border-primary" : "border-input"
                    }`}
                  >
                    {d.include && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                  </button>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                    <div className="md:col-span-2 flex gap-1">
                      {(["der", "die", "das"] as const).map((a) => (
                        <button
                          key={a}
                          onClick={() => updateDraft(i, { article: d.article === a ? null : a })}
                          className={`text-xs px-1.5 py-1 rounded font-medium flex-1 ${
                            d.article === a ? articleColor[a] : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                    <Input
                      className="md:col-span-2"
                      value={d.noun}
                      onChange={(e) => updateDraft(i, { noun: e.target.value })}
                      placeholder="Noun"
                    />
                    <Input
                      className="md:col-span-2"
                      value={d.plural ?? ""}
                      onChange={(e) => updateDraft(i, { plural: e.target.value })}
                      placeholder="Plural"
                    />
                    <Input
                      className="md:col-span-3"
                      value={d.meanings.join(", ")}
                      onChange={(e) =>
                        updateDraft(i, {
                          meanings: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="meanings (comma)"
                    />
                    <div className="md:col-span-3 flex flex-wrap gap-1">
                      {d.themes.map((t) => (
                        <Badge key={t} variant="secondary" className="gap-1 text-xs">
                          {t}
                          <button onClick={() => updateDraft(i, { themes: d.themes.filter((x) => x !== t) })}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      <ThemeAdd onAdd={(t) => updateDraft(i, { themes: [...d.themes, t] })} />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="text-center pt-2">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to deck
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function ThemeAdd({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  const [editing, setEditing] = useState(false);
  if (!editing)
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs px-2 py-0.5 rounded-full border border-dashed text-muted-foreground hover:text-foreground"
      >
        + theme
      </button>
    );
  return (
    <Input
      autoFocus
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (v.trim()) onAdd(v.trim());
        setV("");
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (v.trim()) onAdd(v.trim());
          setV("");
          setEditing(false);
        }
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-6 text-xs w-24"
    />
  );
}
