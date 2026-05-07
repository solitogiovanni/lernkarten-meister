import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Check, X, Pencil } from "lucide-react";
import { applyRating, isDue, type Rating } from "@/lib/srs";
import { answersMatch, normalizeAnswer } from "@/lib/normalize";
import { CardEditDialog, type EditableCard } from "@/components/CardEditDialog";

const searchSchema = z.object({
  mode: fallback(z.enum(["flashcards", "quiz"]), "flashcards").default("flashcards"),
  scope: fallback(z.enum(["all", "due"]), "due").default("due"),
  themes: fallback(z.string(), "").default(""),
  limit: fallback(z.number(), 20).default(20),
  direction: fallback(z.enum(["de2it", "it2de", "mixed"]), "de2it").default("de2it"),
  kinds: fallback(z.string(), "noun,adjective,adverb,verb").default("noun,adjective,adverb,verb"),
});

export const Route = createFileRoute("/campaign_/run")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({ meta: [{ title: "Studying — Wortschatz" }] }),
  component: RunPage,
});

type Kind = "noun" | "adjective" | "adverb" | "verb";

type VerbPrep = { preposition: string; case: "akk" | "dat" | "gen" | null; meaning: string };

type Card = {
  id: string;
  kind: Kind;
  article: "der" | "die" | "das" | null;
  word: string; // German term — for verbs this is "present"
  plural: string | null;
  praeteritum: string | null;
  perfect: string | null;
  prepositions: VerbPrep[];
  meanings: string[];
  examples: string[];
  themes: string[];
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
  due_at: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const articleTextColor = {
  der: "text-blue-700 dark:text-blue-300",
  die: "text-pink-700 dark:text-pink-300",
  das: "text-emerald-700 dark:text-emerald-300",
};

function RunPage() {
  const { mode, scope, themes, limit, direction, kinds } = Route.useSearch();
  const themeList = themes ? themes.split(",").filter(Boolean) : [];
  const kindList = (kinds ? kinds.split(",").filter(Boolean) : ["noun"]) as Kind[];
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    (async () => {
      const wantNoun = kindList.includes("noun");
      const wantWords = kindList.includes("adjective") || kindList.includes("adverb");
      const wantVerb = kindList.includes("verb");
      const wordKinds = kindList.filter((k) => k === "adjective" || k === "adverb");
      const [nRes, wRes, vRes] = await Promise.all([
        wantNoun
          ? supabase.from("nouns").select("id,article,noun,plural,meanings,examples,themes,ease,interval_days,reps,lapses,due_at").limit(2000)
          : Promise.resolve({ data: [] as any[] }),
        wantWords
          ? (supabase as any).from("words").select("id,kind,word,meanings,examples,themes,ease,interval_days,reps,lapses,due_at").in("kind", wordKinds).limit(2000)
          : Promise.resolve({ data: [] as any[] }),
        wantVerb
          ? (supabase as any).from("verbs").select("id,present,praeteritum,perfect,prepositions,meanings,examples,themes,ease,interval_days,reps,lapses,due_at").limit(2000)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const nounCards: Card[] = (nRes.data ?? []).map((r: any) => ({
        id: r.id,
        kind: "noun",
        article: r.article,
        word: r.noun,
        plural: r.plural,
        praeteritum: null,
        perfect: null,
        prepositions: [],
        meanings: r.meanings ?? [],
        examples: r.examples ?? [],
        themes: r.themes ?? [],
        ease: r.ease,
        interval_days: r.interval_days,
        reps: r.reps,
        lapses: r.lapses,
        due_at: r.due_at,
      }));
      const wordCards: Card[] = (wRes.data ?? []).map((r: any) => ({
        id: r.id,
        kind: r.kind,
        article: null,
        word: r.word,
        plural: null,
        praeteritum: null,
        perfect: null,
        prepositions: [],
        meanings: r.meanings ?? [],
        examples: r.examples ?? [],
        themes: r.themes ?? [],
        ease: r.ease,
        interval_days: r.interval_days,
        reps: r.reps,
        lapses: r.lapses,
        due_at: r.due_at,
      }));
      const verbCards: Card[] = (vRes.data ?? []).map((r: any) => ({
        id: r.id,
        kind: "verb",
        article: null,
        word: r.present,
        plural: null,
        praeteritum: r.praeteritum,
        perfect: r.perfect,
        prepositions: r.prepositions ?? [],
        meanings: r.meanings ?? [],
        examples: r.examples ?? [],
        themes: r.themes ?? [],
        ease: r.ease,
        interval_days: r.interval_days,
        reps: r.reps,
        lapses: r.lapses,
        due_at: r.due_at,
      }));

      let pool = [...nounCards, ...wordCards, ...verbCards].filter((c) => {
        if (scope === "due" && !isDue(c.due_at)) return false;
        if (themeList.length > 0 && !c.themes.some((t) => themeList.includes(t))) return false;
        return true;
      });
      pool = shuffle(pool).slice(0, limit);
      setCards(pool);
      setLoading(false);
    })();
  }, []);

  const current = cards[idx];

  const advance = () => {
    if (idx + 1 >= cards.length) setDone(true);
    else setIdx(idx + 1);
  };

  const writeBack = async (card: Card, upd: any) => {
    if (card.kind === "noun") {
      await supabase.from("nouns").update(upd).eq("id", card.id);
    } else if (card.kind === "verb") {
      await (supabase as any).from("verbs").update(upd).eq("id", card.id);
    } else {
      await (supabase as any).from("words").update(upd).eq("id", card.id);
    }
  };

  const submitFlashRating = async (rating: Rating) => {
    if (!current) return;
    const upd = applyRating(current, rating);
    setStats((s) => ({ ...s, correct: s.correct + (rating === "again" ? 0 : 1), wrong: s.wrong + (rating === "again" ? 1 : 0) }));
    await writeBack(current, upd);
    advance();
  };

  const submitQuizResult = async (correct: boolean) => {
    if (!current) return;
    const rating: Rating = correct ? "good" : "again";
    const upd = applyRating(current, rating);
    setStats((s) => ({ correct: s.correct + (correct ? 1 : 0), wrong: s.wrong + (correct ? 0 : 1) }));
    await writeBack(current, upd);
    advance();
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );

  if (cards.length === 0)
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="text-xl font-semibold mb-2">No cards match</h1>
        <p className="text-muted-foreground mb-4">Try another scope, kind, or theme.</p>
        <Button onClick={() => navigate({ to: "/campaign" })}>Back to setup</Button>
      </div>
    );

  if (done) {
    const total = stats.correct + stats.wrong;
    const pct = total ? Math.round((stats.correct / total) * 100) : 0;
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h1 className="text-3xl font-bold">Session complete!</h1>
        <p className="text-muted-foreground">You reviewed {cards.length} cards.</p>
        <div className="grid grid-cols-2 gap-3 my-4">
          <Card className="p-4">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.correct}</div>
            <div className="text-sm text-muted-foreground">correct</div>
          </Card>
          <Card className="p-4">
            <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">{stats.wrong}</div>
            <div className="text-sm text-muted-foreground">wrong</div>
          </Card>
        </div>
        <div className="text-lg">{pct}% accuracy</div>
        <div className="flex justify-center gap-2 pt-4">
          <Button asChild variant="outline"><Link to="/">Back to deck</Link></Button>
          <Button asChild><Link to="/campaign">New campaign</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
        <span>{idx + 1} / {cards.length}</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="h-7 px-2">
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <span>
            <span className="text-emerald-600 dark:text-emerald-400">{stats.correct}</span> ·{" "}
            <span className="text-rose-600 dark:text-rose-400">{stats.wrong}</span>
          </span>
        </div>
      </div>
      <Progress value={((idx) / cards.length) * 100} className="mb-6" />

      {mode === "flashcards" ? (
        <FlashcardView card={current} onRate={submitFlashRating} direction={direction} key={current.id} />
      ) : (
        <QuizView card={current} onResult={submitQuizResult} key={current.id} />
      )}

      {editing && (
        <CardEditDialog
          open={editing}
          onOpenChange={setEditing}
          card={current as EditableCard}
          onSaved={(next) => {
            setCards((prev) => prev.map((c, i) => (i === idx ? (next as Card) : c)));
          }}
        />
      )}
    </div>
  );
}

function KindLabel({ kind }: { kind: Kind }) {
  if (kind === "noun") return null;
  return <p className="text-xs uppercase tracking-wider text-muted-foreground">{kind}</p>;
}

function FlashcardView({
  card,
  onRate,
  direction,
}: {
  card: Card;
  onRate: (r: Rating) => void;
  direction: "de2it" | "it2de" | "mixed";
}) {
  const [revealed, setRevealed] = useState(false);
  const effectiveDir = useMemo<"de2it" | "it2de">(() => {
    if (direction === "mixed") return Math.random() < 0.5 ? "de2it" : "it2de";
    if (direction === "it2de" && card.meanings.length === 0) return "de2it";
    return direction;
  }, [direction, card.id]);

  const isIt2De = effectiveDir === "it2de";

  return (
    <Card className="p-8 min-h-[320px] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        {!revealed ? (
          isIt2De ? (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Italian → German ({card.kind})</p>
              <div className="text-3xl font-semibold tracking-tight">{card.meanings.join(" / ")}</div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">German → Italian ({card.kind})</p>
              <div className="text-4xl font-bold tracking-tight">{card.word}</div>
            </div>
          )
        ) : (
          <>
            <KindLabel kind={card.kind} />
            {card.kind === "noun" && card.article ? (
              <div className={`text-4xl font-bold tracking-tight ${articleTextColor[card.article]}`}>
                {card.article} {card.word}
              </div>
            ) : (
              <div className="text-4xl font-bold tracking-tight">{card.word}</div>
            )}
            <div className="mt-6 space-y-3">
              {card.plural && <div className="text-muted-foreground">Plural: {card.plural}</div>}
              {card.meanings.length > 0 && (
                <div className="text-lg text-muted-foreground">{card.meanings.join(" · ")}</div>
              )}
              {card.examples.length > 0 && (
                <div className="text-sm italic text-muted-foreground border-l-2 pl-3 mt-3 text-left max-w-md">
                  {card.examples[0]}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      {!revealed ? (
        <Button size="lg" onClick={() => setRevealed(true)}>Show answer</Button>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          <Button variant="destructive" onClick={() => onRate("again")}>Again</Button>
          <Button variant="outline" onClick={() => onRate("hard")}>Hard</Button>
          <Button onClick={() => onRate("good")}>Good</Button>
          <Button variant="secondary" onClick={() => onRate("easy")}>Easy</Button>
        </div>
      )}
    </Card>
  );
}

const QUIZ_TYPES = ["article", "plural", "de2it", "it2de"] as const;
type QuizType = (typeof QUIZ_TYPES)[number];

function QuizView({ card, onResult }: { card: Card; onResult: (correct: boolean) => void }) {
  const possibleTypes = useMemo(() => {
    const t: QuizType[] = [];
    if (card.kind === "noun" && card.article) t.push("article");
    if (card.kind === "noun" && card.plural) t.push("plural");
    if (card.meanings.length > 0) {
      t.push("de2it");
      t.push("it2de");
    }
    return t.length ? t : (["de2it"] as QuizType[]);
  }, [card]);

  const qtype = useMemo(() => possibleTypes[Math.floor(Math.random() * possibleTypes.length)], [possibleTypes, card.id]);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<null | { correct: boolean; expected: string }>(null);

  const submit = () => {
    if (result) return;
    let correct = false;
    let expected = "";
    if (qtype === "article") {
      correct = answer.toLowerCase() === card.article;
      expected = card.article ?? "";
    } else if (qtype === "plural") {
      correct = answersMatch(answer, [card.plural ?? ""]);
      expected = card.plural ?? "";
    } else if (qtype === "de2it") {
      correct = answersMatch(answer, card.meanings);
      expected = card.meanings.join(" / ");
    } else {
      correct = normalizeAnswer(answer) === normalizeAnswer(card.word);
      expected = `${card.article ? card.article + " " : ""}${card.word}`;
    }
    setResult({ correct, expected });
    setTimeout(() => onResult(correct), correct ? 700 : 1500);
  };

  return (
    <Card className="p-8 min-h-[320px] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <KindLabel kind={card.kind} />
        {qtype === "article" && (
          <>
            <p className="text-muted-foreground mb-3">Pick the article</p>
            <div className="text-4xl font-bold mb-6">{card.word}</div>
            <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
              {(["der", "die", "das"] as const).map((a) => (
                <Button
                  key={a}
                  size="lg"
                  variant={result ? (a === card.article ? "default" : answer === a ? "destructive" : "outline") : "outline"}
                  disabled={!!result}
                  onClick={() => {
                    setAnswer(a);
                    const correct = a === card.article;
                    setResult({ correct, expected: card.article ?? "" });
                    setTimeout(() => onResult(correct), correct ? 700 : 1500);
                  }}
                >
                  {a}
                </Button>
              ))}
            </div>
          </>
        )}
        {qtype === "plural" && (
          <>
            <p className="text-muted-foreground mb-3">Type the plural of</p>
            <div className="text-3xl font-bold mb-6">
              {card.article && <span className="text-muted-foreground mr-2">{card.article}</span>}
              {card.word}
            </div>
          </>
        )}
        {qtype === "de2it" && (
          <>
            <p className="text-muted-foreground mb-3">Translate to Italian</p>
            <div className="text-3xl font-bold mb-6">
              {card.article && <span className="text-muted-foreground mr-2">{card.article}</span>}
              {card.word}
            </div>
          </>
        )}
        {qtype === "it2de" && (
          <>
            <p className="text-muted-foreground mb-3">Translate to German{card.kind === "noun" ? " (no need for article)" : ""}</p>
            <div className="text-2xl font-semibold mb-6">{card.meanings.join(" / ")}</div>
          </>
        )}

        {qtype !== "article" && (
          <div className="w-full max-w-sm">
            <Input
              autoFocus
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={!!result}
              placeholder="Your answer…"
              className="text-center text-lg"
            />
          </div>
        )}

        {result && (
          <div className={`mt-4 flex items-center gap-2 ${result.correct ? "text-emerald-600" : "text-rose-600"}`}>
            {result.correct ? <Check className="h-5 w-5" /> : <X className="h-5 w-5" />}
            <span className="font-medium">
              {result.correct ? (
                "Correct!"
              ) : (
                <>
                  Answer:{" "}
                  {qtype === "it2de" && card.article ? (
                    <span className={articleTextColor[card.article]}>
                      {card.article} {card.word}
                    </span>
                  ) : (
                    result.expected
                  )}
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {qtype !== "article" && !result && (
        <Button size="lg" onClick={submit} disabled={!answer.trim()}>Submit</Button>
      )}
    </Card>
  );
}
