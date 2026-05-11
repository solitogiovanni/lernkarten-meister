import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, X, Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { autofillMixed, type MixedItem, type MixedKind, type VerbPreposition } from "@/server/autofill.functions";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/supabase-fetch";

export const Route = createFileRoute("/import_")({
  head: () => ({
    meta: [
      { title: "Import — Wortschatz" },
      { name: "description", content: "Paste a mixed list of German words and let AI classify each as noun, verb, adjective or adverb." },
    ],
  }),
  component: ImportPage,
});

type Draft = MixedItem & { include: boolean };

const KIND_LABEL: Record<MixedKind, string> = {
  noun: "Noun",
  verb: "Verb",
  adjective: "Adjective",
  adverb: "Adverb",
  preposition: "Preposition",
  pronoun: "Pronoun",
  conjunction: "Conjunction",
};

const KIND_COLOR: Record<MixedKind, string> = {
  noun: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  verb: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  adjective: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  adverb: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  preposition: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  pronoun: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  conjunction: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
};

const articleColor = {
  der: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  die: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  das: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

const CASES: Array<{ value: "akk" | "dat" | "gen"; label: string }> = [
  { value: "akk", label: "Akk" },
  { value: "dat", label: "Dat" },
  { value: "gen", label: "Gen" },
];

type ParsedLine = { raw: string; word: string; meanings: string[]; article: "der" | "die" | "das" | null };

function parseLine(line: string): ParsedLine {
  const raw = line.trim();
  const [leftRaw, ...rightParts] = raw.split(/\s*[=:]\s*/);
  const left = leftRaw.trim();
  const right = rightParts.join("=").trim();
  const meanings = right ? right.split(/\s*,\s*/).map((s) => s.trim()).filter(Boolean) : [];
  const m = left.match(/^(der|die|das)\s+(.+)$/i);
  if (m) return { raw, word: m[2].trim(), meanings, article: m[1].toLowerCase() as "der" | "die" | "das" };
  return { raw, word: left, meanings, article: null };
}

function draftKey(d: Draft): string {
  if (d.kind === "noun") return (d.noun ?? "").trim().toLowerCase();
  if (d.kind === "verb") return (d.present ?? "").trim().toLowerCase();
  return (d.word ?? "").trim().toLowerCase();
}

function ImportPage() {
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Record<MixedKind, Set<string>>>({
    noun: new Set(),
    verb: new Set(),
    adjective: new Set(),
    adverb: new Set(),
    preposition: new Set(),
    pronoun: new Set(),
    conjunction: new Set(),
  });
  const autofillFn = useServerFn(autofillMixed);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetchAll<{ noun: string }>("nouns", (q) => q.select("noun")),
      fetchAll<{ present: string }>("verbs", (q) => q.select("present")),
      fetchAll<{ word: string; kind: string }>("words", (q) => q.select("word, kind")),
    ]).then(([n, v, w]: any[]) => {
      const buckets: Record<string, Set<string>> = {
        adjective: new Set(), adverb: new Set(), preposition: new Set(), pronoun: new Set(), conjunction: new Set(),
      };
      for (const row of (w.data ?? []) as Array<{ word: string; kind: string }>) {
        const k = row.word.trim().toLowerCase();
        if (buckets[row.kind]) buckets[row.kind].add(k);
      }
      setExisting({
        noun: new Set(((n.data ?? []) as Array<{ noun: string }>).map((r) => r.noun.trim().toLowerCase())),
        verb: new Set(((v.data ?? []) as Array<{ present: string }>).map((r) => r.present.trim().toLowerCase())),
        adjective: buckets.adjective,
        adverb: buckets.adverb,
        preposition: buckets.preposition,
        pronoun: buckets.pronoun,
        conjunction: buckets.conjunction,
      });
    });
  }, []);

  const parsed: ParsedLine[] = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseLine);

  const isDuplicate = (d: Draft, idx: number) => {
    const key = draftKey(d);
    if (!key) return false;
    if (existing[d.kind].has(key)) return true;
    return drafts.findIndex((other, i) => i < idx && other.kind === d.kind && draftKey(other) === key) !== -1;
  };

  const runAi = async () => {
    if (parsed.length === 0) return toast.error("Paste at least one entry");
    if (parsed.length > 50) return toast.error("Max 50 entries at a time");
    setBusy(true);
    try {
      const { results, error } = await autofillFn({
        data: { lines: parsed.map((p) => (p.article ? `${p.article} ${p.word}` : p.word)) },
      });
      if (error) return toast.error(error);
      const merged: Draft[] = parsed.map((p, i) => {
        const r = results[i];
        const kind: MixedKind = (r?.kind as MixedKind) ?? "noun";
        const base: Draft = {
          input: p.raw,
          kind,
          meanings: p.meanings.length ? p.meanings : r?.meanings ?? [],
          themes: r?.themes ?? [],
          examples: r?.examples ?? [],
          include: true,
        };
        if (kind === "noun") {
          base.noun = r?.noun || p.word;
          base.article = p.article ?? r?.article ?? null;
          base.plural = r?.plural ?? null;
        } else if (kind === "verb") {
          base.present = r?.present || p.word.toLowerCase();
          base.praeteritum = r?.praeteritum ?? null;
          base.perfect = r?.perfect ?? null;
          base.prepositions = r?.prepositions ?? [];
        } else {
          base.word = r?.word || p.word.toLowerCase();
        }
        return base;
      });
      // mark duplicates as not-included by default
      merged.forEach((d, i) => {
        const key = draftKey(d);
        if (key && existing[d.kind].has(key)) d.include = false;
      });
      setDrafts(merged);
      const counts = merged.reduce<Record<MixedKind, number>>(
        (acc, d) => ({ ...acc, [d.kind]: (acc[d.kind] ?? 0) + 1 }),
        { noun: 0, verb: 0, adjective: 0, adverb: 0, preposition: 0, pronoun: 0, conjunction: 0 }
      );
      toast.success(
        `Classified ${merged.length}: ${counts.noun}N · ${counts.verb}V · ${counts.adjective}Adj · ${counts.adverb}Adv · ${counts.preposition}Prep · ${counts.pronoun}Pron · ${counts.conjunction}Conj`
      );
    } finally {
      setBusy(false);
    }
  };

  const updateDraft = (i: number, patch: Partial<Draft>) => {
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  };

  const updatePrep = (i: number, j: number, patch: Partial<VerbPreposition>) => {
    setDrafts((ds) =>
      ds.map((d, idx) =>
        idx === i
          ? { ...d, prepositions: (d.prepositions ?? []).map((p, k) => (k === j ? { ...p, ...patch } : p)) }
          : d
      )
    );
  };

  const changeKind = (i: number, kind: MixedKind) => {
    setDrafts((ds) =>
      ds.map((d, idx) => {
        if (idx !== i) return d;
        // Carry over the German surface form across kinds
        const surface = (d.noun ?? d.present ?? d.word ?? "").trim();
        const next: Draft = {
          ...d,
          kind,
          noun: undefined,
          article: null,
          plural: null,
          present: undefined,
          praeteritum: null,
          perfect: null,
          prepositions: [],
          word: undefined,
        };
        if (kind === "noun") {
          next.noun = surface ? surface[0].toUpperCase() + surface.slice(1) : "";
        } else if (kind === "verb") {
          next.present = surface.toLowerCase();
        } else {
          next.word = surface.toLowerCase();
        }
        return next;
      })
    );
  };

  const saveAll = async () => {
    const valid = drafts.filter((d, i) => d.include && draftKey(d) && !isDuplicate(d, i));
    if (valid.length === 0) return toast.error("Nothing to save");
    setSaving(true);
    try {
      const nouns = valid.filter((d) => d.kind === "noun").map((d) => ({
        article: d.article ?? null,
        noun: (d.noun ?? "").trim(),
        plural: d.plural?.trim() || null,
        meanings: d.meanings,
        examples: d.examples,
        themes: d.themes,
      }));
      const verbs = valid.filter((d) => d.kind === "verb").map((d) => ({
        present: (d.present ?? "").trim(),
        praeteritum: d.praeteritum?.trim() || null,
        perfect: d.perfect?.trim() || null,
        prepositions: (d.prepositions ?? []).filter((p) => p.preposition.trim()),
        meanings: d.meanings,
        examples: d.examples,
        themes: d.themes,
      }));
      const words = valid
        .filter((d) => d.kind === "adjective" || d.kind === "adverb")
        .map((d) => ({
          kind: d.kind,
          word: (d.word ?? "").trim(),
          meanings: d.meanings,
          examples: d.examples,
          themes: d.themes,
        }));

      const errors: string[] = [];
      if (nouns.length) {
        const { error } = await supabase.from("nouns").insert(nouns);
        if (error) errors.push(`nouns: ${error.message}`);
      }
      if (verbs.length) {
        const { error } = await (supabase as any).from("verbs").insert(verbs);
        if (error) errors.push(`verbs: ${error.message}`);
      }
      if (words.length) {
        const { error } = await (supabase as any).from("words").insert(words);
        if (error) errors.push(`words: ${error.message}`);
      }
      if (errors.length) return toast.error(errors.join("; "));
      toast.success(
        `Saved ${nouns.length + verbs.length + words.length} (${nouns.length}N · ${verbs.length}V · ${words.filter((w) => w.kind === "adjective").length}Adj · ${words.filter((w) => w.kind === "adverb").length}Adv)`
      );
      navigate({ to: "/" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import</h1>
        <p className="text-sm text-muted-foreground">
          Paste any mix of German words — one per line. AI classifies each as noun, verb, adjective or adverb and saves it to the right deck.
          Optional format: <code>der Wort = meaning1, meaning2</code>.
        </p>
      </div>

      {drafts.length === 0 ? (
        <Card className="p-4 space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"der Tisch = tavolo\ngehen = andare\nschön = bello\nimmer = sempre\nwarten auf = aspettare"}
            rows={12}
            className="font-mono text-sm"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{parsed.length} parsed</span>
            <Button onClick={runAi} disabled={busy || parsed.length === 0}>
              {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
              Classify & auto-fill
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
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
              const dup = isDuplicate(d, i);
              const dupExisting = existing[d.kind].has(draftKey(d));
              return (
                <Card key={i} className={`p-3 ${!d.include ? "opacity-50" : ""} ${dup ? "border-amber-500/60 bg-amber-500/5" : ""}`}>
                  {dup && (
                    <div className="text-xs text-amber-700 dark:text-amber-400 mb-2 font-medium">
                      ⚠ Duplicate — already {dupExisting ? `in your ${d.kind} deck` : "above in this list"}
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => updateDraft(i, { include: !d.include })}
                      className={`mt-1 h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                        d.include ? "bg-primary border-primary" : "border-input"
                      }`}
                    >
                      {d.include && <Check className="h-3.5 w-3.5 text-primary-foreground" />}
                    </button>
                    <div className="flex-1 space-y-2 min-w-0">
                      {/* Kind selector */}
                      <div className="flex flex-wrap gap-1">
                        {(Object.keys(KIND_LABEL) as MixedKind[]).map((k) => (
                          <button
                            key={k}
                            type="button"
                            onClick={() => changeKind(i, k)}
                            className={`text-xs px-2 py-0.5 rounded font-medium ${
                              d.kind === k ? KIND_COLOR[k] : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {KIND_LABEL[k]}
                          </button>
                        ))}
                        <span className="text-xs text-muted-foreground self-center ml-1 truncate">"{d.input}"</span>
                      </div>

                      {/* Kind-specific fields */}
                      {d.kind === "noun" && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
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
                            className="md:col-span-3"
                            value={d.noun ?? ""}
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
                            className="md:col-span-5"
                            value={d.meanings.join(", ")}
                            onChange={(e) =>
                              updateDraft(i, {
                                meanings: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              })
                            }
                            placeholder="meanings (comma)"
                          />
                        </div>
                      )}

                      {d.kind === "verb" && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <Input
                              value={d.present ?? ""}
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
                            value={d.meanings.join(", ")}
                            onChange={(e) =>
                              updateDraft(i, {
                                meanings: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              })
                            }
                            placeholder="meanings (comma)"
                          />
                          <div className="space-y-1.5">
                            {(d.prepositions ?? []).map((p, j) => (
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
                                    updateDraft(i, {
                                      prepositions: (d.prepositions ?? []).filter((_, k) => k !== j),
                                    })
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
                                updateDraft(i, {
                                  prepositions: [...(d.prepositions ?? []), { preposition: "", case: null, meaning: "" }],
                                })
                              }
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" /> Preposition
                            </Button>
                          </div>
                        </>
                      )}

                      {(d.kind === "adjective" || d.kind === "adverb") && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                          <Input
                            className="md:col-span-4"
                            value={d.word ?? ""}
                            onChange={(e) => updateDraft(i, { word: e.target.value })}
                            placeholder={d.kind}
                          />
                          <Input
                            className="md:col-span-8"
                            value={d.meanings.join(", ")}
                            onChange={(e) =>
                              updateDraft(i, {
                                meanings: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              })
                            }
                            placeholder="meanings (comma)"
                          />
                        </div>
                      )}

                      {/* Themes */}
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
