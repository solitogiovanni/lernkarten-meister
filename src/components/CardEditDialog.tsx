import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NounForm, type NounFormValue } from "@/components/NounForm";
import { WordForm, type WordFormValue } from "@/components/WordForm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Kind = "noun" | "adjective" | "adverb";

export type EditableCard = {
  id: string;
  kind: Kind;
  article: "der" | "die" | "das" | null;
  word: string;
  plural: string | null;
  meanings: string[];
  examples: string[];
  themes: string[];
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
  });
  const [word, setWord] = useState<WordFormValue>({
    word: card.word,
    meanings: card.meanings,
    examples: card.examples,
    themes: card.themes,
  });
  const [saving, setSaving] = useState(false);

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
        };
        if (!payload.noun) throw new Error("Noun is required");
        if (kindChanged) {
          const { data, error } = await supabase
            .from("nouns")
            .insert({ ...payload, ...srs })
            .select()
            .single();
          if (error) throw error;
          await (supabase as any).from("words").delete().eq("id", card.id);
          next = {
            ...card,
            id: data.id,
            kind: "noun",
            article: data.article,
            word: data.noun,
            plural: data.plural,
            meanings: data.meanings ?? [],
            examples: data.examples ?? [],
            themes: data.themes ?? [],
          };
        } else {
          const { error } = await supabase.from("nouns").update(payload).eq("id", card.id);
          if (error) throw error;
          next = {
            ...card,
            article: payload.article,
            word: payload.noun,
            plural: payload.plural,
            meanings: payload.meanings,
            examples: payload.examples,
            themes: payload.themes,
          };
        }
      } else {
        const payload = {
          kind,
          word: word.word.trim(),
          meanings: word.meanings,
          examples: word.examples.filter((e) => e.trim()),
          themes: word.themes,
        };
        if (!payload.word) throw new Error("Word is required");
        if (kindChanged && card.kind === "noun") {
          const { data, error } = await (supabase as any)
            .from("words")
            .insert({ ...payload, ...srs })
            .select()
            .single();
          if (error) throw error;
          await supabase.from("nouns").delete().eq("id", card.id);
          next = {
            ...card,
            id: data.id,
            kind,
            article: null,
            word: data.word,
            plural: null,
            meanings: data.meanings ?? [],
            examples: data.examples ?? [],
            themes: data.themes ?? [],
          };
        } else {
          const { error } = await (supabase as any).from("words").update(payload).eq("id", card.id);
          if (error) throw error;
          next = {
            ...card,
            kind,
            article: null,
            plural: null,
            word: payload.word,
            meanings: payload.meanings,
            examples: payload.examples,
            themes: payload.themes,
          };
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
              </SelectContent>
            </Select>
          </div>

          {kind === "noun" ? (
            <NounForm value={noun} onChange={setNoun} />
          ) : (
            <WordForm
              value={word}
              onChange={setWord}
              label={kind === "adjective" ? "Adjective" : "Adverb"}
              placeholder={kind === "adjective" ? "schön" : "schnell"}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
