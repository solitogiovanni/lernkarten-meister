import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { detectWordKinds, type MixedItem, type MixedKind, type VerbPreposition } from "@/lib/autofill.functions";
import { supabase } from "@/integrations/supabase/client";

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

export function AutoDetectDialog({
  open,
  onOpenChange,
  word,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  word: string;
  onSaved?: () => void;
}) {
  const detectFn = useServerFn(detectWordKinds);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    if (!open || !word.trim()) return;
    let cancelled = false;
    setDrafts([]);
    setBusy(true);
    detectFn({ data: { word: word.trim() } })
      .then(({ results, error }) => {
        if (cancelled) return;
        if (error) { toast.error(error); return; }
        if (!results.length) { toast.error("Could not detect a type"); return; }
        setDrafts(results.map((r) => ({ ...r, include: true })));
      })
      .finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [open, word]);

  const updateDraft = (i: number, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const updatePrep = (i: number, j: number, patch: Partial<VerbPreposition>) =>
    setDrafts((ds) =>
      ds.map((d, idx) =>
        idx === i
          ? { ...d, prepositions: (d.prepositions ?? []).map((p, k) => (k === j ? { ...p, ...patch } : p)) }
          : d,
      ),
    );

  const saveAll = async () => {
    const valid = drafts.filter((d) => d.include);
    if (!valid.length) return toast.error("Select at least one");
    setSaving(true);
    try {
      const errors: string[] = [];
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
        conjugation: d.conjugation?.trim() || null,
        praeteritum_conjugation: d.praeteritum_conjugation?.trim() || null,
        prepositions: (d.prepositions ?? []).filter((p) => p.preposition.trim()),
        meanings: d.meanings,
        examples: d.examples,
        themes: d.themes,
      }));
      const WORD_KINDS: MixedKind[] = ["adjective", "adverb", "preposition", "pronoun", "conjunction"];
      const words = valid.filter((d) => WORD_KINDS.includes(d.kind)).map((d) => ({
        kind: d.kind,
        word: (d.word ?? "").trim(),
        meanings: d.meanings,
        examples: d.examples,
        themes: d.themes,
      }));
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
      toast.success(`Saved ${valid.length}`);
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Auto-detect: "{word}"
          </DialogTitle>
          <DialogDescription>
            {busy ? "Detecting…" : drafts.length > 1
              ? `${drafts.length} possible types found. Pick what to save.`
              : "Review and save."}
          </DialogDescription>
        </DialogHeader>

        {busy && (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Analyzing…
          </div>
        )}

        {!busy && drafts.length > 0 && (
          <div className="space-y-2">
            {drafts.map((d, i) => (
              <Card key={i} className={`p-3 ${!d.include ? "opacity-50" : ""}`}>
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
                    <div className="flex flex-wrap gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${KIND_COLOR[d.kind]}`}>
                        {KIND_LABEL[d.kind]}
                      </span>
                    </div>

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
                        <Input className="md:col-span-3" value={d.noun ?? ""} onChange={(e) => updateDraft(i, { noun: e.target.value })} placeholder="Noun" />
                        <Input className="md:col-span-2" value={d.plural ?? ""} onChange={(e) => updateDraft(i, { plural: e.target.value })} placeholder="Plural" />
                        <Input className="md:col-span-5" value={d.meanings.join(", ")} onChange={(e) => updateDraft(i, { meanings: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="meanings (comma)" />
                      </div>
                    )}

                    {d.kind === "verb" && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <Input value={d.present ?? ""} onChange={(e) => updateDraft(i, { present: e.target.value })} placeholder="Infinitive" />
                          <Input value={d.praeteritum ?? ""} onChange={(e) => updateDraft(i, { praeteritum: e.target.value })} placeholder="Präteritum" />
                          <Input value={d.perfect ?? ""} onChange={(e) => updateDraft(i, { perfect: e.target.value })} placeholder="Perfekt" />
                        </div>
                        <Input value={d.conjugation ?? ""} onChange={(e) => updateDraft(i, { conjugation: e.target.value })} placeholder="Präsens: komme / kommst / kommt / kommen / kommt / kommen" />
                        <Input value={d.praeteritum_conjugation ?? ""} onChange={(e) => updateDraft(i, { praeteritum_conjugation: e.target.value })} placeholder="Präteritum: kam / kamst / kam / kamen / kamt / kamen" />
                        <Input value={d.meanings.join(", ")} onChange={(e) => updateDraft(i, { meanings: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="meanings (comma)" />
                        {(d.prepositions ?? []).length > 0 && (
                          <div className="space-y-1.5">
                            {(d.prepositions ?? []).map((p, j) => (
                              <div key={j} className="flex flex-wrap gap-1.5 items-center">
                                <Input className="w-28" value={p.preposition} onChange={(e) => updatePrep(i, j, { preposition: e.target.value })} placeholder="prep" />
                                <div className="flex gap-1">
                                  {CASES.map((c) => (
                                    <button key={c.value} onClick={() => updatePrep(i, j, { case: p.case === c.value ? null : c.value })} className={`text-xs px-2 py-1 rounded ${p.case === c.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                      {c.label}
                                    </button>
                                  ))}
                                </div>
                                <Input className="flex-1 min-w-[120px]" value={p.meaning} onChange={(e) => updatePrep(i, j, { meaning: e.target.value })} placeholder="meaning" />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {(d.kind === "adjective" || d.kind === "adverb" || d.kind === "preposition" || d.kind === "pronoun" || d.kind === "conjunction") && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <Input value={d.word ?? ""} onChange={(e) => updateDraft(i, { word: e.target.value })} placeholder="Word" />
                        <Input value={d.meanings.join(", ")} onChange={(e) => updateDraft(i, { meanings: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="meanings (comma)" />
                      </div>
                    )}

                    {d.examples.length > 0 && (
                      <div className="text-xs text-muted-foreground italic line-clamp-2">
                        {d.examples.join(" · ")}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={saveAll} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Save {drafts.filter((d) => d.include).length > 0 ? `(${drafts.filter((d) => d.include).length})` : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
