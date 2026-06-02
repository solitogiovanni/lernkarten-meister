import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NounForm, type NounFormValue } from "@/components/NounForm";
import { WordForm, type WordFormValue } from "@/components/WordForm";
import { VerbForm, type VerbFormValue, type VerbPrep } from "@/components/VerbForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { autofillNouns, autofillVerbs, autofillWords } from "@/lib/autofill.functions";
import { Loader2, Sparkles } from "lucide-react";

export type Kind = "noun" | "adjective" | "adverb" | "verb" | "preposition" | "pronoun" | "conjunction";

export type EditableCard = {
  id: string;
  kind: Kind;
  article: "der" | "die" | "das" | null;
  word: string; // for verbs this is "present"
  plural: string | null;
  praeteritum?: string | null;
  perfect?: string | null;
  conjugation?: string | null;
  prepositions?: VerbPrep[];
  meanings: string[];
  examples: string[];
  themes: string[];
  comments?: string | null;
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
  due_at: string;
};

export function CardEditDialog({
  open,
  onOpenChange,
  card,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card: EditableCard;
  onSaved: (next: EditableCard) => void;
}) {
  const [kind, setKind] = useState<Kind>(card.kind);
  const [noun, setNoun] = useState<NounFormValue>({
    article: card.article,
    noun: card.word,
    plural: card.plural ?? "",
    meanings: card.meanings,
    examples: card.examples,
    themes: card.themes,
    comments: card.comments ?? "",
  });
  const [word, setWord] = useState<WordFormValue>({
    word: card.word,
    meanings: card.meanings,
    examples: card.examples,
    themes: card.themes,
    comments: card.comments ?? "",
  });
  const [verb, setVerb] = useState<VerbFormValue>({
    present: card.word,
    praeteritum: card.praeteritum ?? "",
    perfect: card.perfect ?? "",
    conjugation: card.conjugation ?? "",
    prepositions: card.prepositions ?? [],
    meanings: card.meanings,
    examples: card.examples,
    themes: card.themes,
    comments: card.comments ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const autofillNounsFn = useServerFn(autofillNouns);
  const autofillVerbsFn = useServerFn(autofillVerbs);
  const autofillWordsFn = useServerFn(autofillWords);

  const aiFill = async () => {
    setAiBusy(true);
    try {
      if (kind === "noun") {
        if (!noun.noun.trim()) return toast.error("Type a noun first");
        const { results, error } = await autofillNounsFn({ data: { nouns: [noun.noun.trim()] } });
        if (error) return toast.error(error);
        const r = results[0];
        if (!r) return toast.error("No result");
        setNoun({
          article: noun.article ?? r.article,
          noun: r.noun || noun.noun,
          plural: noun.plural || r.plural || "",
          meanings: noun.meanings.length ? noun.meanings : r.meanings,
          examples: noun.examples.length ? noun.examples : r.examples ?? [],
          themes: noun.themes.length ? noun.themes : r.themes,
          comments: noun.comments,
        });
      } else if (kind === "verb") {
        if (!verb.present.trim()) return toast.error("Type a verb first");
        const { results, error } = await autofillVerbsFn({ data: { verbs: [verb.present.trim()] } });
        if (error) return toast.error(error);
        const r = results[0];
        if (!r) return toast.error("No result");
        setVerb({
          present: r.present || verb.present,
          praeteritum: verb.praeteritum || r.praeteritum || "",
          perfect: verb.perfect || r.perfect || "",
          conjugation: verb.conjugation || r.conjugation || "",
          prepositions: verb.prepositions.length ? verb.prepositions : (r.prepositions ?? []),
          meanings: verb.meanings.length ? verb.meanings : r.meanings ?? [],
          examples: verb.examples.length ? verb.examples : r.examples ?? [],
          themes: verb.themes.length ? verb.themes : r.themes ?? [],
          comments: verb.comments,
        });
      } else {
        if (!word.word.trim()) return toast.error("Type a word first");
        const { results, error } = await autofillWordsFn({ data: { kind, words: [word.word.trim()] } });
        if (error) return toast.error(error);
        const r = results[0];
        if (!r) return toast.error("No result");
        setWord({
          word: r.word || word.word,
          meanings: word.meanings.length ? word.meanings : r.meanings,
          examples: word.examples.length ? word.examples : r.examples ?? [],
          themes: word.themes.length ? word.themes : r.themes,
          comments: word.comments,
        });
      }
      toast.success("Filled with AI");
    } finally {
      setAiBusy(false);
    }
  };

  const deleteOldRow = async (oldKind: Kind, id: string) => {
    if (oldKind === "noun") await supabase.from("nouns").delete().eq("id", id);
    else if (oldKind === "verb") await (supabase as any).from("verbs").delete().eq("id", id);
    else await (supabase as any).from("words").delete().eq("id", id);
  };

  const save = async () => {
    setSaving(true);
    try {
      const srs = {
        ease: card.ease,
        interval_days: card.interval_days,
        reps: card.reps,
        lapses: card.lapses,
        due_at: card.due_at,
      };
      const kindChanged = kind !== card.kind;
      let next: EditableCard;

      if (kind === "noun") {
        const payload = {
          article: noun.article,
          noun: noun.noun.trim(),
          plural: noun.plural.trim() || null,
          meanings: noun.meanings,
          examples: noun.examples.filter((e) => e.trim()),
          themes: noun.themes,
          comments: noun.comments.trim() || null,
        };
        if (!payload.noun) throw new Error("Noun is required");
        if (kindChanged) {
          const { data, error } = await (supabase as any).from("nouns").insert({ ...payload, ...srs }).select().single();
          if (error) throw error;
          await deleteOldRow(card.kind, card.id);
          next = {
            ...card, id: data.id, kind: "noun", article: data.article, word: data.noun, plural: data.plural,
            praeteritum: null, perfect: null, prepositions: [],
            meanings: data.meanings ?? [], examples: data.examples ?? [], themes: data.themes ?? [], comments: data.comments ?? null,
          };
        } else {
          const { error } = await (supabase as any).from("nouns").update(payload).eq("id", card.id);
          if (error) throw error;
          next = { ...card, article: payload.article, word: payload.noun, plural: payload.plural,
            meanings: payload.meanings, examples: payload.examples, themes: payload.themes, comments: payload.comments };
        }
      } else if (kind === "verb") {
        const payload = {
          present: verb.present.trim(),
          praeteritum: verb.praeteritum.trim() || null,
          perfect: verb.perfect.trim() || null,
          conjugation: verb.conjugation.trim() || null,
          prepositions: verb.prepositions.filter((p) => p.preposition.trim()),
          meanings: verb.meanings,
          examples: verb.examples.filter((e) => e.trim()),
          themes: verb.themes,
          comments: verb.comments.trim() || null,
        };
        if (!payload.present) throw new Error("Present is required");
        if (kindChanged) {
          const { data, error } = await (supabase as any).from("verbs").insert({ ...payload, ...srs }).select().single();
          if (error) throw error;
          await deleteOldRow(card.kind, card.id);
          next = {
            ...card, id: data.id, kind: "verb", article: null, word: data.present, plural: null,
            praeteritum: data.praeteritum, perfect: data.perfect, conjugation: data.conjugation, prepositions: data.prepositions ?? [],
            meanings: data.meanings ?? [], examples: data.examples ?? [], themes: data.themes ?? [], comments: data.comments ?? null,
          };
        } else {
          const { error } = await (supabase as any).from("verbs").update(payload).eq("id", card.id);
          if (error) throw error;
          next = { ...card, kind: "verb", article: null, plural: null, word: payload.present,
            praeteritum: payload.praeteritum, perfect: payload.perfect, conjugation: payload.conjugation, prepositions: payload.prepositions,
            meanings: payload.meanings, examples: payload.examples, themes: payload.themes, comments: payload.comments };
        }
      } else {
        const payload = {
          kind,
          word: word.word.trim(),
          meanings: word.meanings,
          examples: word.examples.filter((e) => e.trim()),
          themes: word.themes,
          comments: word.comments.trim() || null,
        };
        if (!payload.word) throw new Error("Word is required");
        if (kindChanged) {
          const { data, error } = await (supabase as any).from("words").insert({ ...payload, ...srs }).select().single();
          if (error) throw error;
          await deleteOldRow(card.kind, card.id);
          next = {
            ...card, id: data.id, kind, article: null, word: data.word, plural: null,
            praeteritum: null, perfect: null, prepositions: [],
            meanings: data.meanings ?? [], examples: data.examples ?? [], themes: data.themes ?? [], comments: data.comments ?? null,
          };
        } else {
          const { error } = await (supabase as any).from("words").update(payload).eq("id", card.id);
          if (error) throw error;
          next = { ...card, kind, article: null, plural: null, word: payload.word,
            meanings: payload.meanings, examples: payload.examples, themes: payload.themes, comments: payload.comments };
        }
      }

      toast.success("Card updated");
      onSaved(next);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="noun">Noun</SelectItem>
                <SelectItem value="adjective">Adjective</SelectItem>
                <SelectItem value="adverb">Adverb</SelectItem>
                <SelectItem value="verb">Verb</SelectItem>
                <SelectItem value="preposition">Preposition</SelectItem>
                <SelectItem value="pronoun">Pronoun</SelectItem>
                <SelectItem value="conjunction">Conjunction</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind === "noun" ? (
            <NounForm value={noun} onChange={setNoun} />
          ) : kind === "verb" ? (
            <VerbForm value={verb} onChange={setVerb} />
          ) : (
            <WordForm
              value={word}
              onChange={setWord}
              label={kind.charAt(0).toUpperCase() + kind.slice(1)}
              placeholder={kind === "adjective" ? "schön" : kind === "adverb" ? "schnell" : kind === "preposition" ? "auf" : kind === "pronoun" ? "ich" : "und"}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="secondary" onClick={aiFill} disabled={aiBusy || saving}>
            {aiBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} AI fill
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
