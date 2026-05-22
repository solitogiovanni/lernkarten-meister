import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SpeakButton } from "@/components/SpeakButton";
import { Pencil } from "lucide-react";
import type { VerbPrep } from "@/components/VerbForm";

export type RevealKind = "noun" | "adjective" | "adverb" | "verb" | "preposition" | "pronoun" | "conjunction";

export type RevealCard = {
  kind: RevealKind;
  article?: "der" | "die" | "das" | null;
  word: string;
  plural?: string | null;
  praeteritum?: string | null;
  perfect?: string | null;
  conjugation?: string | null;
  prepositions?: VerbPrep[];
  meanings: string[];
  examples: string[];
  themes: string[];
  comments?: string | null;
};

const articleTextColor = {
  der: "text-blue-600 dark:text-blue-400",
  die: "text-pink-600 dark:text-pink-400",
  das: "text-emerald-600 dark:text-emerald-400",
};

const kindLabel: Record<RevealKind, string> = {
  noun: "Noun",
  adjective: "Adjective",
  adverb: "Adverb",
  verb: "Verb",
  preposition: "Preposition",
  pronoun: "Pronoun",
  conjunction: "Conjunction",
};

export function CardRevealDialog({
  open,
  onOpenChange,
  card,
  onEdit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  card: RevealCard | null;
  onEdit: () => void;
}) {
  if (!card) return null;
  const speakText = card.kind === "noun" && card.article ? `${card.article} ${card.word}` : card.word;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <div className="flex flex-col items-center text-center pt-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{kindLabel[card.kind]}</p>
          <div className="flex items-center justify-center gap-2">
            {card.kind === "noun" && card.article ? (
              <div className={`text-4xl font-bold tracking-tight ${articleTextColor[card.article]}`}>
                {card.article} {card.word}
              </div>
            ) : (
              <div className="text-4xl font-bold tracking-tight">{card.word}</div>
            )}
            <SpeakButton text={speakText} size="icon" variant="ghost" />
          </div>

          <div className="mt-6 space-y-3 w-full">
            {card.plural && (
              <div className="text-muted-foreground flex items-center justify-center gap-1">
                <span>Plural: {card.plural}</span>
                <SpeakButton text={`die ${card.plural}`} size="icon" variant="ghost" />
              </div>
            )}
            {card.kind === "verb" && (card.praeteritum || card.perfect) && (
              <div className="text-muted-foreground space-y-0.5">
                {card.praeteritum && (
                  <div className="flex items-center justify-center gap-1">
                    <span>Präteritum: <span className="font-medium text-foreground">{card.praeteritum}</span></span>
                    <SpeakButton text={card.praeteritum} size="icon" variant="ghost" />
                  </div>
                )}
                {card.perfect && (
                  <div className="flex items-center justify-center gap-1">
                    <span>Perfekt: <span className="font-medium text-foreground">{card.perfect}</span></span>
                    <SpeakButton text={card.perfect} size="icon" variant="ghost" />
                  </div>
                )}
                {card.conjugation && (
                  <div className="text-sm">
                    <span className="text-xs uppercase tracking-wider">Konjugation: </span>
                    <span className="font-medium text-foreground">{card.conjugation}</span>
                  </div>
                )}
              </div>
            )}
            {card.kind === "verb" && card.prepositions && card.prepositions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {card.prepositions.map((p, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full border bg-muted">
                    {p.preposition}
                    {p.case ? ` +${p.case.charAt(0).toUpperCase() + p.case.slice(1)}` : ""}
                    {p.meaning && <span className="text-muted-foreground"> — {p.meaning}</span>}
                  </span>
                ))}
              </div>
            )}
            {card.meanings.length > 0 && (
              <div className="text-lg text-muted-foreground">{card.meanings.join(" · ")}</div>
            )}
            {card.examples.length > 0 && (
              <div className="text-sm italic text-muted-foreground border-l-2 pl-3 mt-3 text-left max-w-md mx-auto space-y-1">
                {card.examples.map((ex, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <span className="flex-1">{ex}</span>
                    <SpeakButton text={ex} size="icon" variant="ghost" />
                  </div>
                ))}
              </div>
            )}
            {card.comments && (
              <div className="text-sm text-amber-700 dark:text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded-md px-3 py-2 mt-3 text-left max-w-md mx-auto">
                <span className="mr-1">📝</span>
                {/<[a-z][\s\S]*>/i.test(card.comments) ? (
                  <span
                    className="rich-text-view inline"
                    dangerouslySetInnerHTML={{ __html: card.comments }}
                  />
                ) : (
                  <span className="whitespace-pre-wrap">{card.comments}</span>
                )}
              </div>
            )}
            {card.themes.length > 0 && (
              <div className="flex flex-wrap gap-1 justify-center pt-2">
                {card.themes.map((t) => (
                  <Badge key={t} variant="secondary" className="text-[10px] py-0">{t}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-1" /> Edit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
