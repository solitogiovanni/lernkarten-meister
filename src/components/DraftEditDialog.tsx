import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NounForm, type NounFormValue } from "@/components/NounForm";
import { WordForm, type WordFormValue } from "@/components/WordForm";
import { VerbForm, type VerbFormValue } from "@/components/VerbForm";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { autofillNouns, autofillVerbs, autofillWords, type MixedItem, type MixedKind } from "@/lib/autofill.functions";
import { Loader2, Sparkles } from "lucide-react";

export type DraftItem = MixedItem & { comments?: string };

export function DraftEditDialog({
  open,
  onOpenChange,
  draft,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: DraftItem;
  onSave: (next: DraftItem) => void;
}) {
  const [kind, setKind] = useState<MixedKind>(draft.kind);
  const [noun, setNoun] = useState<NounFormValue>({
    article: draft.article ?? null,
    noun: draft.noun ?? draft.word ?? draft.present ?? draft.input,
    plural: draft.plural ?? "",
    meanings: draft.meanings ?? [],
    examples: draft.examples ?? [],
    themes: draft.themes ?? [],
    synonyms: draft.synonyms ?? [],
    antonyms: draft.antonyms ?? [],
    comments: draft.comments ?? "",
  });
  const [word, setWord] = useState<WordFormValue>({
    word: draft.word ?? draft.noun ?? draft.present ?? draft.input,
    meanings: draft.meanings ?? [],
    examples: draft.examples ?? [],
    themes: draft.themes ?? [],
    synonyms: draft.synonyms ?? [],
    antonyms: draft.antonyms ?? [],
    comments: draft.comments ?? "",
  });
  const [verb, setVerb] = useState<VerbFormValue>({
    present: draft.present ?? draft.word ?? draft.noun ?? draft.input,
    praeteritum: draft.praeteritum ?? "",
    perfect: draft.perfect ?? "",
    conjugation: draft.conjugation ?? "",
    praeteritumConjugation: draft.praeteritum_conjugation ?? "",
    prepositions: (draft.prepositions ?? []).map((p) => ({
      preposition: p.preposition,
      case: p.case ?? null,
      meaning: p.meaning ?? "",
    })),
    meanings: draft.meanings ?? [],
    examples: draft.examples ?? [],
    themes: draft.themes ?? [],
    synonyms: draft.synonyms ?? [],
    antonyms: draft.antonyms ?? [],
    comments: draft.comments ?? "",
  });
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
          synonyms: noun.synonyms.length ? noun.synonyms : r.synonyms ?? [],
          antonyms: noun.antonyms.length ? noun.antonyms : r.antonyms ?? [],
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
          praeteritumConjugation: verb.praeteritumConjugation || r.praeteritum_conjugation || "",
          prepositions: verb.prepositions.length ? verb.prepositions : (r.prepositions ?? []),
          meanings: verb.meanings.length ? verb.meanings : r.meanings ?? [],
          examples: verb.examples.length ? verb.examples : r.examples ?? [],
          themes: verb.themes.length ? verb.themes : r.themes ?? [],
          synonyms: verb.synonyms.length ? verb.synonyms : r.synonyms ?? [],
          antonyms: verb.antonyms.length ? verb.antonyms : r.antonyms ?? [],
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
          synonyms: word.synonyms.length ? word.synonyms : r.synonyms ?? [],
          antonyms: word.antonyms.length ? word.antonyms : r.antonyms ?? [],
          comments: word.comments,
        });
      }
      toast.success("Filled with AI");
    } finally {
      setAiBusy(false);
    }
  };

  const done = () => {
    let next: DraftItem;
    if (kind === "noun") {
      if (!noun.noun.trim()) return toast.error("Noun is required");
      next = {
        ...draft, kind, article: noun.article, noun: noun.noun.trim(), plural: noun.plural.trim() || null,
        word: undefined, present: undefined,
        meanings: noun.meanings, examples: noun.examples.filter((e) => e.trim()), themes: noun.themes,
        synonyms: noun.synonyms, antonyms: noun.antonyms, comments: noun.comments,
      };
    } else if (kind === "verb") {
      if (!verb.present.trim()) return toast.error("Verb is required");
      next = {
        ...draft, kind, present: verb.present.trim(), praeteritum: verb.praeteritum.trim() || null,
        perfect: verb.perfect.trim() || null, conjugation: verb.conjugation.trim() || null,
        praeteritum_conjugation: verb.praeteritumConjugation.trim() || null,
        prepositions: verb.prepositions.filter((p) => p.preposition.trim()),
        noun: undefined, article: null, plural: null, word: undefined,
        meanings: verb.meanings, examples: verb.examples.filter((e) => e.trim()), themes: verb.themes,
        synonyms: verb.synonyms, antonyms: verb.antonyms, comments: verb.comments,
      };
    } else {
      if (!word.word.trim()) return toast.error("Word is required");
      next = {
        ...draft, kind, word: word.word.trim(), noun: undefined, present: undefined, article: null, plural: null,
        prepositions: [],
        meanings: word.meanings, examples: word.examples.filter((e) => e.trim()), themes: word.themes,
        synonyms: word.synonyms, antonyms: word.antonyms, comments: word.comments,
      };
    }
    onSave(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit before saving</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as MixedKind)}>
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
              showSynonyms={kind === "adjective" || kind === "adverb"}
              placeholder={kind === "adjective" ? "schön" : kind === "adverb" ? "schnell" : kind === "preposition" ? "auf" : kind === "pronoun" ? "ich" : "und"}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="secondary" onClick={aiFill} disabled={aiBusy}>
            {aiBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />} AI fill
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={done}>Done</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
