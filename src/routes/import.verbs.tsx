import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, X, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { autofillVerbs, type AutofilledVerb, type VerbPreposition } from "@/lib/autofill.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/supabase-fetch";

export const Route = createFileRoute("/import/verbs")({
  head: () => ({
    meta: [{ title: "Import verbs — Wortschatz" }],
  }),
  component: ImportVerbsPage,
});

type Draft = AutofilledVerb & { include: boolean };

const CASES: Array<{ value: "akk" | "dat" | "gen"; label: string }> = [
  { value: "akk", label: "Akk" },
  { value: "dat", label: "Dat" },
  { value: "gen", label: "Gen" },
];

function ImportVerbsPage() {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Set<string>>(new Set());
  const autofillFn = useServerFn(autofillVerbs);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll<{ present: string }>("verbs", (q) => q.select("present")).then(({ data }) => {
      setExisting(new Set(data.map((r) => r.present.trim().toLowerCase())));
    });
  }, []);

  const isDuplicate = (present: string, idx: number) => {
    const key = present.trim().toLowerCase();
    if (!key) return false;
    if (existing.has(key)) return true;
    return drafts.findIndex((d, i) => i < idx && d.present.trim().toLowerCase() === key) !== -1;
  };

  type ParsedLine = { raw: string; present: string; meanings: string[] };

  const parseLine = (line: string): ParsedLine => {
    const raw = line.trim();
    const [leftRaw, ...rightParts] = raw.split(/\s*[=:]\s*/);
    const present = leftRaw.trim();
    const right = rightParts.join("=").trim();
    const meanings = right ? right.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean) : [];
    return { raw, present, meanings };
  };

  const parsed: ParsedLine[] = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLine);

  const runAi = async () => {
    if (parsed.length === 0) return toast.error("Paste at least one verb");
    if (parsed.length > 50) return toast.error("Max 50 at a time");
    setBusy(true);
    try {
      const { results, error } = await autofillFn({
        data: { verbs: parsed.map((p) => p.present) },
      });
      if (error) return toast.error(error);
      const merged: Draft[] = parsed.map((p, i) => {
        const r = results[i];
        const present = r?.present || p.present;
        const dupExisting = existing.has(present.trim().toLowerCase());
        return {
          input: p.raw,
          present,
          praeteritum: r?.praeteritum ?? null,
          perfect: r?.perfect ?? null,
          conjugation: r?.conjugation ?? null,
          praeteritum_conjugation: r?.praeteritum_conjugation ?? null,
          prepositions: r?.prepositions ?? [],
          meanings: p.meanings.length ? p.meanings : r?.meanings ?? [],
          themes: r?.themes ?? [],
          examples: r?.examples ?? [],
          include: !dupExisting,
        };
      });
      setDrafts(merged);
      toast.success(`AI filled ${merged.length} verbs`);
    } finally {
      setBusy(false);
    }
  };

  const skipAi = () => {
    setDrafts(
      parsed.map((p) => {
        const dupExisting = existing.has(p.present.trim().toLowerCase());
        return {
          input: p.raw,
          present: p.present,
          praeteritum: null,
          perfect: null,
          conjugation: null,
          praeteritum_conjugation: null,
          prepositions: [],
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

  const updatePrep = (i: number, j: number, patch: Partial<VerbPreposition>) => {
    setDrafts((ds) =>
      ds.map((d, idx) =>
        idx === i ? { ...d, prepositions: d.prepositions.map((p, k) => (k === j ? { ...p, ...patch } : p)) } : d
      )
    );
  };

  const saveAll = async () => {
    const toInsert = drafts.filter((d, i) => d.include && d.present.trim() && !isDuplicate(d.present, i));
    if (toInsert.length === 0) return toast.error("Nothing to save");
    setSaving(true);
    const rows = toInsert.map((d) => ({
      present: d.present.trim(),
      praeteritum: d.praeteritum?.trim() || null,
      perfect: d.perfect?.trim() || null,
      conjugation: d.conjugation?.trim() || null,
      praeteritum_conjugation: d.praeteritum_conjugation?.trim() || null,
      prepositions: d.prepositions.filter((p) => p.preposition.trim()),
      meanings: d.meanings,
      examples: [] as string[],
      themes: d.themes,
    }));
    const { error } = await (supabase as any).from("verbs").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Saved ${rows.length} verbs`);
    navigate({ to: "/verbs" });
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import verbs</h1>
        <p className="text-sm text-muted-foreground">
          One verb per line. Format: <code>infinitive = meaning1, meaning2</code>. AI fills Präteritum, Perfekt, prepositions, themes.
        </p>
      </div>

      {drafts.length === 0 ? (
        <Card className="p-4 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"gehen = andare\nwarten = aspettare\nsich freuen = rallegrarsi"}
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
              const dup = isDuplicate(d.present, i);
              const dupExisting = existing.has(d.present.trim().toLowerCase());
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
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                          value={d.present}
                          onChange={(e) => updateDraft(i, { present: e.target.value })}
                          placeholder="Infinitive (gehen)"
                        />
                        <Input
                          value={d.praeteritum ?? ""}
                          onChange={(e) => updateDraft(i, { praeteritum: e.target.value })}
                          placeholder="Präteritum (ging)"
                        />
                        <Input
                          value={d.perfect ?? ""}
                          onChange={(e) => updateDraft(i, { perfect: e.target.value })}
                          placeholder="Perfekt (ist gegangen)"
                        />
                      </div>
                      <Input
                        value={d.conjugation ?? ""}
                        onChange={(e) => updateDraft(i, { conjugation: e.target.value })}
                        placeholder="Konjugation (komme / kommst / kommt / kommen / kommt / kommen)"
                      />
                      <Input
                        value={d.meanings.join(", ")}
                        onChange={(e) =>
                          updateDraft(i, {
                            meanings: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                          })
                        }
                        placeholder="meanings (comma)"
                      />
                      <div className="space-y-1.5">
                        {d.prepositions.map((p, j) => (
                          <div key={j} className="flex flex-wrap gap-1.5 items-center">
                            <Input
                              className="w-24 h-8"
                              value={p.preposition}
                              onChange={(e) => updatePrep(i, j, { preposition: e.target.value })}
                              placeholder="auf"
                            />
                            <div className="flex gap-1">
                              {CASES.map((c) => (
                                <Button
                                  key={c.value}
                                  type="button"
                                  size="sm"
                                  variant={p.case === c.value ? "default" : "outline"}
                                  className="h-8 px-2"
                                  onClick={() => updatePrep(i, j, { case: p.case === c.value ? null : c.value })}
                                >
                                  {c.label}
                                </Button>
                              ))}
                            </div>
                            <Input
                              className="flex-1 min-w-[140px] h-8"
                              value={p.meaning}
                              onChange={(e) => updatePrep(i, j, { meaning: e.target.value })}
                              placeholder="meaning"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                updateDraft(i, { prepositions: d.prepositions.filter((_, k) => k !== j) })
                              }
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7"
                          onClick={() =>
                            updateDraft(i, { prepositions: [...d.prepositions, { preposition: "", case: null, meaning: "" }] })
                          }
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Preposition
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
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
            <Link to="/verbs" className="text-sm text-muted-foreground hover:text-foreground">
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
