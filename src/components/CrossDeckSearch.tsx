import { TagChips } from "@/components/TagsInput";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { CardRevealDialog, type RevealCard } from "@/components/CardReveal";
import { toggleCardTheme } from "@/lib/cardThemes";
import { toast } from "sonner";
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
  tags?: string[] | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
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
  tags?: string[] | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
  comments: string | null;
};
type NoteHit = { id: string; title: string; tags: string[]; folder_id: string | null };
type WordHit = {
  id: string;
  word: string;
  kind: "adjective" | "adverb" | "preposition" | "pronoun" | "conjunction";
  meanings: string[];
  examples: string[];
  themes: string[];
  tags?: string[] | null;
  synonyms: string[] | null;
  antonyms: string[] | null;
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
export const GRAMMAR_PREFILL_KEY = "wortschatz:grammarPrefill";
export const GRAMMAR_SEARCH_KEY = "wortschatz:grammarSearch";

export function CrossDeckSearch({
  q,
  currentKind,
  hasLocalMatches,
  onRefresh,
  onTagSearch,
}: {
  q: string;
  currentKind: DeckKind | "grammar";
  hasLocalMatches: boolean;
  onRefresh?: () => void;
  onTagSearch?: (tag: string) => void;
}) {
  const [notes, setNotes] = useState<NoteHit[]>([]);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [nouns, setNouns] = useState<NounHit[]>([]);
  const [verbs, setVerbs] = useState<VerbHit[]>([]);
  const [words, setWords] = useState<WordHit[]>([]);
  const [preview, setPreview] = useState<{ card: RevealCard; kind: DeckKind; id: string } | null>(null);
  const [autoDetect, setAutoDetect] = useState(false);
  const [tick, setTick] = useState(0);
  const [searchFailed, setSearchFailed] = useState(false);



  useEffect(() => {
    const raw = q.trim();
    const term = raw.replace(/^#+/, "").trim();
    if (term.length < 2) {
      setNouns([]); setVerbs([]); setWords([]); setNotes([]); setSearchFailed(false);
      return;
    }
    let cancelled = false;
    const ctrl = new AbortController();
    const handle = setTimeout(async () => {
      setBusy(true);
      const like = `%${term}%`;
      const sb: any = supabase;
      const sig = ctrl.signal;
      const nounSel = "id,article,noun,plural,meanings,examples,themes,tags,synonyms,antonyms,comments";
      const verbSel = "id,present,praeteritum,perfect,prepositions,meanings,examples,themes,tags,synonyms,antonyms,comments";
      const wordSel = "id,word,kind,meanings,examples,themes,tags,synonyms,antonyms,comments";

      // Meaning search folds text and uses trigram indexes, which need at least
      // 3 characters; shorter terms would force a full scan and can time out.
      const deep = term.length >= 3;
      const [nWord, nMean, vWord, vMean, wWord, wMean] = await Promise.all([
        currentKind === "noun"
          ? Promise.resolve({ data: [] as NounHit[] })
          : sb.from("nouns").select(nounSel).or(`noun.ilike.${like},plural.ilike.${like}`).limit(20).abortSignal(sig),
        currentKind === "noun" || !deep
          ? Promise.resolve({ data: [] as NounHit[] })
          : sb.rpc("search_nouns_by_meaning", { term }).abortSignal(sig),
        currentKind === "verb"
          ? Promise.resolve({ data: [] as VerbHit[] })
          : sb.from("verbs").select(verbSel).ilike("present", like).limit(20).abortSignal(sig),
        currentKind === "verb" || !deep
          ? Promise.resolve({ data: [] as VerbHit[] })
          : sb.rpc("search_verbs_by_meaning", { term }).abortSignal(sig),
        sb.from("words").select(wordSel).ilike("word", like).limit(40).abortSignal(sig),
        deep ? sb.rpc("search_words_by_meaning", { term }).abortSignal(sig) : Promise.resolve({ data: [] as WordHit[] }),
      ]);
      // Tag matches across every card type + Grammar notes (exact tag, a few case variants).
      const tagVariants = Array.from(new Set([term, term.toLowerCase(), term.charAt(0).toUpperCase() + term.slice(1).toLowerCase()]));
      const [nTag, vTag, wTag, gTag, gTitle] = await Promise.all([
        currentKind === "noun" ? Promise.resolve({ data: [] }) : sb.from("nouns").select(nounSel).overlaps("tags", tagVariants).limit(40).abortSignal(sig),
        currentKind === "verb" ? Promise.resolve({ data: [] }) : sb.from("verbs").select(verbSel).overlaps("tags", tagVariants).limit(40).abortSignal(sig),
        sb.from("words").select(wordSel).overlaps("tags", tagVariants).limit(60).abortSignal(sig),
        currentKind === "grammar" ? Promise.resolve({ data: [] }) : sb.from("grammar_notes").select("id,title,tags,folder_id").overlaps("tags", tagVariants).limit(40).abortSignal(sig),
        currentKind === "grammar" ? Promise.resolve({ data: [] }) : sb.from("grammar_notes").select("id,title,tags,folder_id").ilike("title", like).limit(20).abortSignal(sig),
      ]);
      if (cancelled) return;
      {
        const m = new Map<string, NoteHit>();
        for (const r of [...((gTag.data ?? []) as NoteHit[]), ...((gTitle.data ?? []) as NoteHit[])]) m.set(r.id, r);
        setNotes(Array.from(m.values()));
      }
      const dedupe = <T extends { id: string }>(...lists: T[][]) => {
        const m = new Map<string, T>();
        for (const list of lists) for (const r of list) m.set(r.id, r);
        return Array.from(m.values());
      };
      setNouns(dedupe<NounHit>((nWord.data ?? []) as NounHit[], (nMean.data ?? []) as NounHit[], (nTag.data ?? []) as NounHit[]));
      setVerbs(dedupe<VerbHit>((vWord.data ?? []) as VerbHit[], (vMean.data ?? []) as VerbHit[], (vTag.data ?? []) as VerbHit[]));
      const wordsAll = dedupe<WordHit>((wWord.data ?? []) as WordHit[], (wMean.data ?? []) as WordHit[], (wTag.data ?? []) as WordHit[])
        .filter((x) => x.kind !== currentKind);
      setWords(wordsAll);
      const failed = [nWord, nMean, vWord, vMean, wWord, wMean].some((r: any) => r?.error);
      setSearchFailed(failed);
      setBusy(false);
    }, 350);
    return () => { cancelled = true; clearTimeout(handle); ctrl.abort(); };
  }, [q, currentKind, tick]);

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
      tags: r.tags ?? [],
      synonyms: r.synonyms ?? [],
      antonyms: r.antonyms ?? [],
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
      tags: r.tags ?? [],
      synonyms: r.synonyms ?? [],
      antonyms: r.antonyms ?? [],
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
      tags: r.tags ?? [],
      synonyms: r.synonyms ?? [],
      antonyms: r.antonyms ?? [],
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
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium">
              {r.article && <span className="text-muted-foreground mr-1">{r.article}</span>}
              {r.noun}
            </div>
            <SpeakButton text={r.article ? `${r.article} ${r.noun}` : r.noun} size="icon" variant="ghost" className="h-5 w-5" />
          </div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
          <TagChips tags={r.tags} onClick={onTagSearch} />
        </button>
      )),
    },
    {
      kind: "verb",
      label: labelFor.verb,
      count: verbs.length,
      render: () => verbs.map((r) => (
        <button key={r.id} type="button" onClick={() => openVerb(r)} className={cardCls}>
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium">{r.present}</div>
            <SpeakButton text={r.present} size="icon" variant="ghost" className="h-5 w-5" />
          </div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
          <TagChips tags={r.tags} onClick={onTagSearch} />
        </button>
      )),
    },
    {
      kind: "adjective",
      label: labelFor.adjective,
      count: adjectives.length,
      render: () => adjectives.map((r) => (
        <button key={r.id} type="button" onClick={() => openWord(r)} className={cardCls}>
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium">{r.word}</div>
            <SpeakButton text={r.word} size="icon" variant="ghost" className="h-5 w-5" />
          </div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
          <TagChips tags={r.tags} onClick={onTagSearch} />
        </button>
      )),
    },
    {
      kind: "adverb",
      label: labelFor.adverb,
      count: adverbs.length,
      render: () => adverbs.map((r) => (
        <button key={r.id} type="button" onClick={() => openWord(r)} className={cardCls}>
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium">{r.word}</div>
            <SpeakButton text={r.word} size="icon" variant="ghost" className="h-5 w-5" />
          </div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
          <TagChips tags={r.tags} onClick={onTagSearch} />
        </button>
      )),
    },
    ...(["preposition", "pronoun", "conjunction"] as const).map((kk) => ({
      kind: kk,
      label: labelFor[kk],
      count: words.filter((w) => w.kind === kk).length,
      render: () => words.filter((w) => w.kind === kk).map((r) => (
        <button key={r.id} type="button" onClick={() => openWord(r)} className={cardCls}>
          <div className="flex items-center gap-1">
            <div className="text-sm font-medium">{r.word}</div>
            <SpeakButton text={r.word} size="icon" variant="ghost" className="h-5 w-5" />
          </div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
          <TagChips tags={r.tags} onClick={onTagSearch} />
        </button>
      )),
    })),
  ] as { kind: DeckKind; label: string; render: () => React.ReactNode; count: number }[]).filter((g) => g.kind !== currentKind);

  const otherTotal = nouns.length + verbs.length + words.length + notes.length;
  const term = q.trim();

  const openNote = (n: NoteHit) => {
    sessionStorage.setItem(GRAMMAR_SEARCH_KEY, JSON.stringify({ q: n.title, id: n.id }));
    navigate({ to: "/grammar" });
  };

  if (busy && otherTotal === 0 && hasLocalMatches) return null;

  const onEditPreview = () => {
    if (!preview) return;
    sessionStorage.setItem(EDIT_PREFILL_KEY, JSON.stringify({ kind: preview.kind, id: preview.id, q: term }));
    setPreview(null);
    navigate({ to: targetFor[preview.kind] });
  };

  const noMatchAnywhere = !hasLocalMatches && otherTotal === 0 && !busy && !searchFailed;

  const addToGrammar = () => {
    sessionStorage.setItem(GRAMMAR_PREFILL_KEY, term);
    navigate({ to: "/grammar" });
  };

  const addBar = (
    <Card className="p-6 text-center mt-6">
      <p className="text-muted-foreground mb-4">
        {searchFailed ? (
          <>Search took too long, so these results may be incomplete. Try again before adding "<span className="font-medium text-foreground">{term}</span>".</>
        ) : noMatchAnywhere ? (
          <>No matches for "<span className="font-medium text-foreground">{term}</span>" anywhere.</>
        ) : (
          <>Add "<span className="font-medium text-foreground">{term}</span>"?</>
        )}
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        <Button variant="secondary" size="lg" className="w-full sm:w-auto min-h-12 text-base" onClick={() => setAutoDetect(true)}>
          <Sparkles className="h-5 w-5 mr-2" /> Auto-detect type
        </Button>
        <Button variant="outline" size="lg" className="w-full sm:w-auto min-h-12 text-base" onClick={addToGrammar}>
          <BookOpen className="h-5 w-5 mr-2" /> Add to Grammar
        </Button>
      </div>
      <AutoDetectDialog
        open={autoDetect}
        onOpenChange={setAutoDetect}
        word={term}
        onSaved={() => {
          if (onRefresh) { onRefresh(); setTick((t) => t + 1); }
          else if (typeof window !== "undefined") window.location.reload();
        }}
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
          {notes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">Grammar notes</h3>
                <Badge variant="secondary" className="text-[10px]">{notes.length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {notes.map((n) => (
                  <button key={n.id} type="button" onClick={() => openNote(n)} className={cardCls}>
                    <div className="flex items-center gap-1 text-sm font-medium"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" />{n.title}</div>
                    <TagChips tags={n.tags} onClick={onTagSearch} />
                  </button>
                ))}
              </div>
            </div>
          )}
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
      {!busy && currentKind !== "grammar" && addBar}
      <CardRevealDialog
        open={!!preview}
        onOpenChange={(o) => !o && setPreview(null)}
        card={preview?.card ?? null}
        onEdit={onEditPreview}
        onTagClick={onTagSearch ? (t) => { setPreview(null); onTagSearch(t); } : undefined}
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
