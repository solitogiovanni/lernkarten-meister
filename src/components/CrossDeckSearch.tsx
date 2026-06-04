import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { CardRevealDialog, type RevealCard } from "@/components/CardReveal";
import { AutoDetectDialog } from "@/components/AutoDetectDialog";
import { SpeakButton } from "@/components/SpeakButton";
import type { VerbPrep } from "@/components/VerbForm";

export type DeckKind = "noun" | "verb" | "adjective" | "adverb" | "preposition" | "pronoun" | "conjunction";

type NounHit = {
  id: string;
  article: "der" | "die" | "das" | null;
  noun: string;
  plural: string | null;
  meanings: string[];
  examples: string[];
  themes: string[];
  comments: string | null;
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
  comments: string | null;
};
type WordHit = {
  id: string;
  word: string;
  kind: "adjective" | "adverb" | "preposition" | "pronoun" | "conjunction";
  meanings: string[];
  examples: string[];
  themes: string[];
  comments: string | null;
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

export const ADD_PREFILL_KEY = "wortschatz:addPrefill";
export const EDIT_PREFILL_KEY = "wortschatz:editPrefill";

export function CrossDeckSearch({
  q,
  currentKind,
  hasLocalMatches,
  onProposeAdd,
}: {
  q: string;
  currentKind: DeckKind;
  hasLocalMatches: boolean;
  onProposeAdd?: (kind: DeckKind, word: string) => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [nouns, setNouns] = useState<NounHit[]>([]);
  const [verbs, setVerbs] = useState<VerbHit[]>([]);
  const [words, setWords] = useState<WordHit[]>([]);
  const [preview, setPreview] = useState<{ card: RevealCard; kind: DeckKind; id: string } | null>(null);
  const [autoDetect, setAutoDetect] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setNouns([]); setVerbs([]); setWords([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setBusy(true);
      const like = `%${term}%`;
      const sb: any = supabase;
      const nounSel = "id,article,noun,plural,meanings,examples,themes,comments";
      const verbSel = "id,present,praeteritum,perfect,prepositions,meanings,examples,themes,comments";
      const wordSel = "id,word,kind,meanings,examples,themes,comments";

      const [nWord, nMean, vWord, vMean, wWord, wMean] = await Promise.all([
        currentKind === "noun"
          ? Promise.resolve({ data: [] as NounHit[] })
          : sb.from("nouns").select(nounSel).or(`noun.ilike.${like},plural.ilike.${like}`).limit(20),
        currentKind === "noun"
          ? Promise.resolve({ data: [] as NounHit[] })
          : sb.rpc("search_nouns_by_meaning", { term }),
        currentKind === "verb"
          ? Promise.resolve({ data: [] as VerbHit[] })
          : sb.from("verbs").select(verbSel).ilike("present", like).limit(20),
        currentKind === "verb"
          ? Promise.resolve({ data: [] as VerbHit[] })
          : sb.rpc("search_verbs_by_meaning", { term }),
        sb.from("words").select(wordSel).ilike("word", like).limit(40),
        sb.rpc("search_words_by_meaning", { term }),
      ]);
      if (cancelled) return;
      const dedupe = <T extends { id: string }>(...lists: T[][]) => {
        const m = new Map<string, T>();
        for (const list of lists) for (const r of list) m.set(r.id, r);
        return Array.from(m.values());
      };
      setNouns(dedupe<NounHit>((nWord.data ?? []) as NounHit[], (nMean.data ?? []) as NounHit[]));
      setVerbs(dedupe<VerbHit>((vWord.data ?? []) as VerbHit[], (vMean.data ?? []) as VerbHit[]));
      const wordsAll = dedupe<WordHit>((wWord.data ?? []) as WordHit[], (wMean.data ?? []) as WordHit[])
        .filter((x) => x.kind !== currentKind);
      setWords(wordsAll);
      setBusy(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [q, currentKind]);

  if (q.trim().length < 2) return null;

  const adjectives = words.filter((w) => w.kind === "adjective");
  const adverbs = words.filter((w) => w.kind === "adverb");
  const prepositions = words.filter((w) => w.kind === "preposition");
  const pronouns = words.filter((w) => w.kind === "pronoun");
  const conjunctions = words.filter((w) => w.kind === "conjunction");

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
      comments: r.comments,
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
      comments: r.comments,
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
      comments: r.comments,
    },
  });

  const cardCls = "block w-full text-left p-3 rounded-md border bg-card hover:border-primary transition-colors";

  const groups: { kind: DeckKind; label: string; render: () => React.ReactNode; count: number }[] = ([
    {
      kind: "noun",
      label: labelFor.noun,
      count: nouns.length,
      render: () => nouns.map((r) => (
        <button key={r.id} type="button" onClick={() => openNoun(r)} className={cardCls}>
          <div className="text-sm font-medium">
            {r.article && <span className="text-muted-foreground mr-1">{r.article}</span>}
            {r.noun}
          </div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
        </button>
      )),
    },
    {
      kind: "verb",
      label: labelFor.verb,
      count: verbs.length,
      render: () => verbs.map((r) => (
        <button key={r.id} type="button" onClick={() => openVerb(r)} className={cardCls}>
          <div className="text-sm font-medium">{r.present}</div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
        </button>
      )),
    },
    {
      kind: "adjective",
      label: labelFor.adjective,
      count: adjectives.length,
      render: () => adjectives.map((r) => (
        <button key={r.id} type="button" onClick={() => openWord(r)} className={cardCls}>
          <div className="text-sm font-medium">{r.word}</div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
        </button>
      )),
    },
    {
      kind: "adverb",
      label: labelFor.adverb,
      count: adverbs.length,
      render: () => adverbs.map((r) => (
        <button key={r.id} type="button" onClick={() => openWord(r)} className={cardCls}>
          <div className="text-sm font-medium">{r.word}</div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
        </button>
      )),
    },
    ...(["preposition", "pronoun", "conjunction"] as const).map((kk) => ({
      kind: kk,
      label: labelFor[kk],
      count: words.filter((w) => w.kind === kk).length,
      render: () => words.filter((w) => w.kind === kk).map((r) => (
        <button key={r.id} type="button" onClick={() => openWord(r)} className={cardCls}>
          <div className="text-sm font-medium">{r.word}</div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
        </button>
      )),
    })),
  ] as { kind: DeckKind; label: string; render: () => React.ReactNode; count: number }[]).filter((g) => g.kind !== currentKind);

  const otherTotal = nouns.length + verbs.length + words.length;
  const term = q.trim();

  if (busy && otherTotal === 0 && hasLocalMatches) return null;

  const proposeAdd = (kind: DeckKind) => {
    if (kind === currentKind && onProposeAdd) {
      onProposeAdd(kind, term);
      return;
    }
    sessionStorage.setItem(ADD_PREFILL_KEY, JSON.stringify({ kind, word: term }));
    navigate({ to: targetFor[kind] });
  };

  const onEditPreview = () => {
    if (!preview) return;
    sessionStorage.setItem(EDIT_PREFILL_KEY, JSON.stringify({ kind: preview.kind, id: preview.id }));
    setPreview(null);
    navigate({ to: targetFor[preview.kind] });
  };

  const noMatchAnywhere = !hasLocalMatches && otherTotal === 0 && !busy;

  const addBar = (
    <Card className="p-6 text-center mt-6">
      <p className="text-muted-foreground mb-4">
        {noMatchAnywhere ? (
          <>No matches for "<span className="font-medium text-foreground">{term}</span>" anywhere. Add it as:</>
        ) : (
          <>Add "<span className="font-medium text-foreground">{term}</span>" as:</>
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-2 mb-3">
        {(["noun", "verb", "adjective", "adverb"] as DeckKind[]).map((k) => (
          <Button key={k} variant={k === currentKind ? "default" : "outline"} size="sm" onClick={() => proposeAdd(k)}>
            <Plus className="h-4 w-4 mr-1" /> {labelFor[k].slice(0, -1)}
          </Button>
        ))}
      </div>
      <div className="flex justify-center">
        <Button variant="secondary" size="sm" onClick={() => setAutoDetect(true)}>
          <Sparkles className="h-4 w-4 mr-1" /> Auto-detect type
        </Button>
      </div>
      <AutoDetectDialog
        open={autoDetect}
        onOpenChange={setAutoDetect}
        word={term}
        onSaved={() => { if (typeof window !== "undefined") window.location.reload(); }}
      />
    </Card>
  );

  return (
    <>
      {otherTotal > 0 && (
        <div className="space-y-4 mt-6">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Other matches
            </h2>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </div>
          {groups.filter((g) => g.count > 0).map((g) => (
            <div key={g.kind} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">{g.label}</h3>
                <Badge variant="secondary" className="text-[10px]">{g.count}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {g.render()}
              </div>
            </div>
          ))}
        </div>
      )}
      {!busy && addBar}
      <CardRevealDialog
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        card={preview?.card ?? null}
        onEdit={onEditPreview}
      />
    </>
  );
}
