import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { CardRevealDialog, type RevealCard } from "@/components/CardReveal";
import { toggleCardTheme } from "@/lib/cardThemes";
import { toast } from "sonner";
import { SpeakButton } from "@/components/SpeakButton";
import { EDIT_PREFILL_KEY, type DeckKind } from "@/components/CrossDeckSearch";
import type { VerbPrep } from "@/components/VerbForm";

type NounHit = {
  id: string;
  article: "der" | "die" | "das" | null;
  noun: string;
  plural: string | null;
  meanings: string[];
  examples: string[];
  themes: string[];
  synonyms: string[] | null;
  antonyms: string[] | null;
  comments: string | null;
  image_url: string | null;
};
type VerbHit = {
  id: string;
  present: string;
  praeteritum: string | null;
  perfect: string | null;
  prepositions: VerbPrep[];
  meanings: string[];
  examples: string[];
  themes: string[];
  synonyms: string[] | null;
  antonyms: string[] | null;
  comments: string | null;
  image_url: string | null;
};
type WordHit = {
  id: string;
  word: string;
  kind: "adjective" | "adverb" | "preposition" | "pronoun" | "conjunction";
  meanings: string[];
  examples: string[];
  themes: string[];
  synonyms: string[] | null;
  antonyms: string[] | null;
  comments: string | null;
  image_url: string | null;
};

const targetFor: Record<DeckKind, "/" | "/verbs" | "/adjectives" | "/adverbs" | "/prepositions" | "/pronouns" | "/conjunctions"> = {
  noun: "/",
  verb: "/verbs",
  adjective: "/adjectives",
  adverb: "/adverbs",
  preposition: "/prepositions",
  pronoun: "/pronouns",
  conjunction: "/conjunctions",
};

const labelFor: Record<DeckKind, string> = {
  noun: "Nouns",
  verb: "Verbs",
  adjective: "Adjectives",
  adverb: "Adverbs",
  preposition: "Prepositions",
  pronoun: "Pronouns",
  conjunction: "Conjunctions",
};

/**
 * Shows the items of every OTHER deck that carry any of the selected themes,
 * so a thematic group can be reviewed without switching tabs.
 */
export function CrossDeckThemes({
  themes,
  currentKind,
  mode = "any",
}: {
  themes: string[];
  currentKind: DeckKind;
  mode?: "any" | "all";
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [nouns, setNouns] = useState<NounHit[]>([]);
  const [verbs, setVerbs] = useState<VerbHit[]>([]);
  const [words, setWords] = useState<WordHit[]>([]);
  const [preview, setPreview] = useState<{ card: RevealCard; kind: DeckKind; id: string } | null>(null);

  const key = themes.join("\u0000");


  useEffect(() => {
    if (themes.length === 0) {
      setNouns([]); setVerbs([]); setWords([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setBusy(true);
      const sb: any = supabase;
      const nounSel = "id,article,noun,plural,meanings,examples,themes,synonyms,antonyms,comments,image_url";
      const verbSel = "id,present,praeteritum,perfect,prepositions,meanings,examples,themes,synonyms,antonyms,comments,image_url";
      const wordSel = "id,word,kind,meanings,examples,themes,synonyms,antonyms,comments,image_url";
      const match = (query: any) =>
        mode === "all" ? query.contains("themes", themes) : query.overlaps("themes", themes);
      const wordKinds = ["adjective", "adverb", "preposition", "pronoun", "conjunction"] as const;
      const otherWordKinds = wordKinds.filter((k) => k !== currentKind);
      const [n, v, w] = await Promise.all([
        currentKind === "noun"
          ? Promise.resolve({ data: [] as NounHit[] })
          : match(sb.from("nouns").select(nounSel)).order("noun").limit(200),
        currentKind === "verb"
          ? Promise.resolve({ data: [] as VerbHit[] })
          : match(sb.from("verbs").select(verbSel)).order("present").limit(200),
        match(sb.from("words").select(wordSel).in("kind", otherWordKinds)).order("word").limit(400),
      ]);
      if (cancelled) return;
      if (n.error) console.error(n.error);
      if (v.error) console.error(v.error);
      if (w.error) console.error(w.error);
      setNouns((n.data ?? []) as NounHit[]);
      setVerbs((v.data ?? []) as VerbHit[]);
      setWords((w.data ?? []) as WordHit[]);

      setBusy(false);
    })();
    return () => { cancelled = true; };
  }, [key, currentKind, mode]);

  if (themes.length === 0) return null;


  const total = nouns.length + verbs.length + words.length;
  if (!busy && total === 0) return null;

  const openNoun = (r: NounHit) => setPreview({
    kind: "noun",
    id: r.id,
    card: {
      kind: "noun",
      article: r.article,
      word: r.noun,
      plural: r.plural,
      meanings: r.meanings ?? [],
      examples: r.examples ?? [],
      themes: r.themes ?? [],
      synonyms: r.synonyms ?? [],
      antonyms: r.antonyms ?? [],
      comments: r.comments,
      imageUrl: r.image_url,
    },
  });
  const openVerb = (r: VerbHit) => setPreview({
    kind: "verb",
    id: r.id,
    card: {
      kind: "verb",
      word: r.present,
      praeteritum: r.praeteritum,
      perfect: r.perfect,
      prepositions: r.prepositions ?? [],
      meanings: r.meanings ?? [],
      examples: r.examples ?? [],
      themes: r.themes ?? [],
      synonyms: r.synonyms ?? [],
      antonyms: r.antonyms ?? [],
      comments: r.comments,
      imageUrl: r.image_url,
    },
  });
  const openWord = (r: WordHit) => setPreview({
    kind: r.kind,
    id: r.id,
    card: {
      kind: r.kind,
      word: r.word,
      meanings: r.meanings ?? [],
      examples: r.examples ?? [],
      themes: r.themes ?? [],
      synonyms: r.synonyms ?? [],
      antonyms: r.antonyms ?? [],
      comments: r.comments,
      imageUrl: r.image_url,
    },
  });

  const cardCls = "block w-full text-left p-3 rounded-md border bg-card hover:border-primary transition-colors";

  const item = (id: string, label: string, speak: string, meanings: string[], onClick: () => void) => (
    <button key={id} type="button" onClick={onClick} className={cardCls}>
      <div className="flex items-center gap-1">
        <div className="text-sm font-medium">{label}</div>
        <SpeakButton text={speak} size="icon" variant="ghost" className="h-5 w-5" />
      </div>
      {meanings.length > 0 && (
        <div className="text-xs text-muted-foreground line-clamp-1">{meanings.join(", ")}</div>
      )}
    </button>
  );

  const groups: { kind: DeckKind; count: number; render: () => React.ReactNode }[] = [
    {
      kind: "noun",
      count: nouns.length,
      render: () => nouns.map((r) =>
        item(r.id, `${r.article ? r.article + " " : ""}${r.noun}`, r.article ? `${r.article} ${r.noun}` : r.noun, r.meanings ?? [], () => openNoun(r))),
    },
    {
      kind: "verb",
      count: verbs.length,
      render: () => verbs.map((r) => item(r.id, r.present, r.present, r.meanings ?? [], () => openVerb(r))),
    },
    ...(["adjective", "adverb", "preposition", "pronoun", "conjunction"] as const).map((kk) => ({
      kind: kk as DeckKind,
      count: words.filter((w) => w.kind === kk).length,
      render: () => words.filter((w) => w.kind === kk).map((r) => item(r.id, r.word, r.word, r.meanings ?? [], () => openWord(r))),
    })),
  ];

  const onEditPreview = () => {
    if (!preview) return;
    sessionStorage.setItem(EDIT_PREFILL_KEY, JSON.stringify({ kind: preview.kind, id: preview.id }));
    const to = targetFor[preview.kind];
    setPreview(null);
    navigate({ to });
  };

  return (
    <>
      <details className="mt-8 group" open>
        <summary className="cursor-pointer select-none inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
          Other words with these themes
          <Badge variant="secondary" className="text-[10px]">{total}</Badge>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </summary>
        <div className="space-y-4 mt-4">
          {groups.filter((g) => g.count > 0).map((g) => (
            <div key={g.kind} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">{labelFor[g.kind]}</h3>
                <Badge variant="outline" className="text-[10px]">{g.count}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{g.render()}</div>
            </div>
          ))}
        </div>
      </details>
      <CardRevealDialog
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        card={preview?.card ?? null}
        onEdit={onEditPreview}
        onToggleTheme={async (theme, add) => {
          if (!preview) return;
          try {
            const themes = await toggleCardTheme(preview.kind, preview.id, theme, add, preview.card.themes);
            setPreview({ ...preview, card: { ...preview.card, themes } });
            const patch = <T extends { id: string; themes: string[] }>(list: T[]) =>
              list.map((r) => (r.id === preview.id ? { ...r, themes } : r));
            if (preview.kind === "noun") setNouns((l) => patch(l));
            else if (preview.kind === "verb") setVerbs((l) => patch(l));
            else setWords((l) => patch(l));
          } catch (e: any) {
            toast.error(e?.message ?? "Could not update themes");
          }
        }}
      />
    </>
  );
}
