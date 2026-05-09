import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, X, Check } from "lucide-react";
import { toast } from "sonner";
import { autofillWords, type AutofilledWord } from "@/server/autofill.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";

type Kind = "adjective" | "adverb";
type Draft = AutofilledWord & { include: boolean };

export function WordImportPage({
  kind,
  title,
  hint,
  placeholder,
}: {
  kind: Kind;
  title: string;
  hint: string;
  placeholder: string;
}) {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const autofillFn = useServerFn(autofillWords);
  const navigate = useNavigate();

  useEffect(() => {
    (supabase as any)
      .from("words")
      .select("word")
      .eq("kind", kind)
      .limit(5000)
      .then(({ data }: { data: Array<{ word: string }> | null }) => {
        setExisting(new Set((data ?? []).map((r) => r.word.trim().toLowerCase())));
      });
  }, [kind]);

  const isDuplicate = (word: string, idx: number) => {
    const key = word.trim().toLowerCase();
    if (!key) return false;
    if (existing.has(key)) return true;
    return drafts.findIndex((d, i) => i < idx && d.word.trim().toLowerCase() === key) !== -1;
  };

  type ParsedLine = { raw: string; word: string; meanings: string[] };

  const parseLine = (line: string): ParsedLine => {
    const raw = line.trim();
    const [leftRaw, ...rightParts] = raw.split(/\s*[=:]\s*/);
    const word = leftRaw.trim();
    const right = rightParts.join("=").trim();
    const meanings = right
      ? right.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean)
      : [];
    return { raw, word, meanings };
  };

  const parsed: ParsedLine[] = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLine);

  const runAi = async () => {
    if (parsed.length === 0) return toast.error("Paste at least one entry");
    if (parsed.length > 50) return toast.error("Max 50 at a time");
    setBusy(true);
    try {
      const { results, error } = await autofillFn({
        data: { kind, words: parsed.map((p) => p.word) },
      });
      if (error) return toast.error(error);
      const merged: Draft[] = parsed.map((p, i) => {
        const r = results[i];
        const word = r?.word || p.word;
        const dupExisting = existing.has(word.trim().toLowerCase());
        return {
          input: p.raw,
          word,
          meanings: p.meanings.length ? p.meanings : r?.meanings ?? [],
          themes: r?.themes ?? [],
          examples: r?.examples ?? [],
          include: !dupExisting,
        };
      });
      setDrafts(merged);
      toast.success(`AI filled ${merged.length} entries`);
    } finally {
      setBusy(false);
    }
  };

  const skipAi = () => {
    setDrafts(
      parsed.map((p) => {
        const dupExisting = existing.has(p.word.trim().toLowerCase());
        return {
          input: p.raw,
          word: p.word,
          meanings: p.meanings,
          themes: [],
          examples: [],
          include: !dupExisting,
        };
      })
    );
  };

  const updateDraft = (i: number, patch: Partial<Draft>) => {
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  const saveAll = async () => {
    const toInsert = drafts.filter((d, i) => d.include && d.word.trim() && !isDuplicate(d.word, i));
    if (toInsert.length === 0) return toast.error("Nothing to save");
    setSaving(true);
    const rows = toInsert.map((d) => ({
      kind,
      word: d.word.trim(),
      meanings: d.meanings,
      examples: [] as string[],
      themes: d.themes,
    }));
    const { error } = await (supabase as any).from("words").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${rows.length} entries`);
    navigate({ to: kind === "adjective" ? "/adjectives" : "/adverbs" });
  };

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>

      {drafts.length === 0 ? (
        <Card className="p-4 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={12}
            className="font-mono text-sm"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{parsed.length} parsed</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={skipAi} disabled={parsed.length === 0}>Skip AI</Button>
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
                <Button variant="ghost" size="sm" onClick={() => setDrafts([])}>Start over</Button>
                <Button onClick={saveAll} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save all
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            {drafts.map((d, i) => {
              const dup = isDuplicate(d.word, i);
              const dupExisting = existing.has(d.word.trim().toLowerCase());
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
                      className={`mt-1 h-5 w-5 rounded border flex items-center justify-center ${d.include ? "bg-primary border-primary" : "border-input"}`}
                    >
                      {d.include && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                    </button>
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <Input
                        className="md:col-span-3"
                        value={d.word}
                        onChange={(e) => updateDraft(i, { word: e.target.value })}
                        placeholder={kind}
                      />
                      <Input
                        className="md:col-span-5"
                        value={d.meanings.join(", ")}
                        onChange={(e) =>
                          updateDraft(i, {
                            meanings: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="meanings (comma)"
                      />
                      <div className="md:col-span-4 flex flex-wrap gap-1">
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
              );
            })}
          </div>

          <div className="text-center pt-2">
            <Link to={kind === "adjective" ? "/adjectives" : "/adverbs"} className="text-sm text-muted-foreground hover:text-foreground">
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
      onBlur={() => { if (v.trim()) onAdd(v.trim()); setV(""); setEditing(false); }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { if (v.trim()) onAdd(v.trim()); setV(""); setEditing(false); }
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-6 text-xs w-24"
    />
  );
}
