import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";

export type DeckKind = "noun" | "verb" | "adjective" | "adverb";

type NounHit = { id: string; article: string | null; noun: string; meanings: string[] };
type VerbHit = { id: string; present: string; meanings: string[] };
type WordHit = { id: string; word: string; kind: "adjective" | "adverb"; meanings: string[] };

const targetFor: Record<DeckKind, "/" | "/verbs" | "/adjectives" | "/adverbs"> = {
  noun: "/",
  verb: "/verbs",
  adjective: "/adjectives",
  adverb: "/adverbs",
};

const labelFor: Record<DeckKind, string> = {
  noun: "Nouns",
  verb: "Verbs",
  adjective: "Adjectives",
  adverb: "Adverbs",
};

export const ADD_PREFILL_KEY = "wortschatz:addPrefill";

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
      const [n, v, w] = await Promise.all([
        currentKind === "noun"
          ? Promise.resolve({ data: [] as NounHit[] })
          : (supabase as any)
              .from("nouns")
              .select("id,article,noun,meanings")
              .or(`noun.ilike.${like},meanings.cs.{${term}}`)
              .limit(20),
        currentKind === "verb"
          ? Promise.resolve({ data: [] as VerbHit[] })
          : (supabase as any)
              .from("verbs")
              .select("id,present,meanings")
              .or(`present.ilike.${like},meanings.cs.{${term}}`)
              .limit(20),
        (supabase as any)
          .from("words")
          .select("id,word,kind,meanings")
          .or(`word.ilike.${like},meanings.cs.{${term}}`)
          .limit(40),
      ]);
      if (cancelled) return;
      setNouns((n.data ?? []) as NounHit[]);
      setVerbs((v.data ?? []) as VerbHit[]);
      const wordsAll = ((w.data ?? []) as WordHit[]).filter((x) => x.kind !== currentKind);
      setWords(wordsAll);
      setBusy(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [q, currentKind]);

  if (q.trim().length < 2) return null;

  const adjectives = words.filter((w) => w.kind === "adjective");
  const adverbs = words.filter((w) => w.kind === "adverb");

  const groups: { kind: DeckKind; label: string; render: () => React.ReactNode; count: number }[] = ([
    {
      kind: "noun",
      label: labelFor.noun,
      count: nouns.length,
      render: () => nouns.map((r) => (
        <Link key={r.id} to="/" search={{ q: r.noun, theme: "", due: false }}
          className="block p-3 rounded-md border bg-card hover:border-primary transition-colors">
          <div className="text-sm font-medium">
            {r.article && <span className="text-muted-foreground mr-1">{r.article}</span>}
            {r.noun}
          </div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
        </Link>
      )),
    },
    {
      kind: "verb",
      label: labelFor.verb,
      count: verbs.length,
      render: () => verbs.map((r) => (
        <Link key={r.id} to="/verbs" className="block p-3 rounded-md border bg-card hover:border-primary transition-colors">
          <div className="text-sm font-medium">{r.present}</div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
        </Link>
      )),
    },
    {
      kind: "adjective",
      label: labelFor.adjective,
      count: adjectives.length,
      render: () => adjectives.map((r) => (
        <Link key={r.id} to="/adjectives" className="block p-3 rounded-md border bg-card hover:border-primary transition-colors">
          <div className="text-sm font-medium">{r.word}</div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
        </Link>
      )),
    },
    {
      kind: "adverb",
      label: labelFor.adverb,
      count: adverbs.length,
      render: () => adverbs.map((r) => (
        <Link key={r.id} to="/adverbs" className="block p-3 rounded-md border bg-card hover:border-primary transition-colors">
          <div className="text-sm font-medium">{r.word}</div>
          {r.meanings.length > 0 && (
            <div className="text-xs text-muted-foreground line-clamp-1">{r.meanings.join(", ")}</div>
          )}
        </Link>
      )),
    },
  ] as { kind: DeckKind; label: string; render: () => React.ReactNode; count: number }[]).filter((g) => g.kind !== currentKind);

  const otherTotal = nouns.length + verbs.length + words.length;

  if (busy && otherTotal === 0 && hasLocalMatches) return null;

  if (!hasLocalMatches && otherTotal === 0 && !busy) {
    const term = q.trim();
    const proposeAdd = (kind: DeckKind) => {
      if (kind === currentKind && onProposeAdd) {
        onProposeAdd(kind, term);
        return;
      }
      sessionStorage.setItem(ADD_PREFILL_KEY, JSON.stringify({ kind, word: term }));
      navigate({ to: targetFor[kind] });
    };
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground mb-4">
          No matches for "<span className="font-medium text-foreground">{term}</span>" anywhere. Add it as:
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {(["noun", "verb", "adjective", "adverb"] as DeckKind[]).map((k) => (
            <Button key={k} variant={k === currentKind ? "default" : "outline"} size="sm" onClick={() => proposeAdd(k)}>
              <Plus className="h-4 w-4 mr-1" /> {labelFor[k].slice(0, -1)}
            </Button>
          ))}
        </div>
      </Card>
    );
  }

  if (otherTotal === 0) return null;

  return (
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
  );
}
