import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpeakButton } from "@/components/SpeakButton";
import { AlertTriangle, Columns2, Plus, X, Link2 } from "lucide-react";
import { toast } from "sonner";
import { fetchOneCard } from "@/lib/deckCache";
import { mergeConfusionGroups, type CardTable, type ConfusedEntry, type CardRef, type ConfusionMember } from "@/lib/confusionGroups";
export type { CardTable, ConfusedEntry } from "@/lib/confusionGroups";

type Suggestion = { id: string; table: CardTable; word: string; label: string; meanings: string[] };

const db = supabase as any;

function headword(table: CardTable, r: any): string {
  if (table === "nouns") return r.article ? `${r.article} ${r.noun}` : r.noun;
  if (table === "verbs") return r.present;
  return r.word;
}

async function readList(table: CardTable, id: string): Promise<ConfusedEntry[]> {
  const { data, error } = await db.from(table).select("confused_with").eq("id", id).maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.confused_with) ? data.confused_with : [];
}

async function writeList(table: CardTable, id: string, list: ConfusedEntry[]) {
  const { error } = await db.from(table).update({ confused_with: list }).eq("id", id);
  if (error) throw error;
}

async function readMember(ref: CardRef): Promise<ConfusionMember | null> {
  const columns = ref.table === "nouns" ? "noun,article" : ref.table === "verbs" ? "present" : "word";
  const { data, error } = await db.from(ref.table).select(`${columns},meanings,confused_with`).eq("id", ref.id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...ref, word: headword(ref.table, data), meaning: (data.meanings ?? []).join(", "), entries: Array.isArray(data.confused_with) ? data.confused_with : [] };
}

async function searchCards(term: string, signal: AbortSignal): Promise<Suggestion[]> {
  const t = term.replace(/[%,()]/g, "").trim();
  if (t.length < 2) return [];
  const like = `${t}%`;
  const [n, v, w] = await Promise.all([
    db.from("nouns").select("id,article,noun,meanings").ilike("noun", like).limit(6).abortSignal(signal),
    db.from("verbs").select("id,present,meanings").ilike("present", like).limit(6).abortSignal(signal),
    db.from("words").select("id,word,kind,meanings").ilike("word", like).limit(6).abortSignal(signal),
  ]);
  const out: Suggestion[] = [];
  for (const r of n.data ?? []) out.push({ id: r.id, table: "nouns", word: headword("nouns", r), label: "Noun", meanings: r.meanings ?? [] });
  for (const r of v.data ?? []) out.push({ id: r.id, table: "verbs", word: r.present, label: "Verb", meanings: r.meanings ?? [] });
  for (const r of w.data ?? []) out.push({ id: r.id, table: "words", word: r.word, label: r.kind, meanings: r.meanings ?? [] });
  return out;
}

export function ConfusedWithPanel({
  table,
  id,
  editable = true,
}: {
  table: CardTable;
  id: string;
  editable?: boolean;
}) {
  const [list, setList] = useState<ConfusedEntry[] | null>(null);
  const [selfInfo, setSelfInfo] = useState<{ word: string; meaning: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [link, setLink] = useState<Suggestion | null>(null);
  const [reciprocal, setReciprocal] = useState(true);
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [compare, setCompare] = useState<ConfusedEntry | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    setList(null);
    db.from(table).select("*").eq("id", id).maybeSingle().then(({ data }: any) => {
      if (!alive || !data) return;
      setList(Array.isArray(data.confused_with) ? data.confused_with : []);
      setSelfInfo({ word: headword(table, data), meaning: (data.meanings ?? []).join(", ") });
    });
    return () => { alive = false; };
  }, [table, id]);

  useEffect(() => {
    if (link && link.word === word) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const h = setTimeout(() => {
      searchCards(word, ac.signal).then((r) => {
        if (!ac.signal.aborted) setSugs(r.filter((s) => s.id !== id));
      }).catch(() => {});
    }, 250);
    return () => { clearTimeout(h); ac.abort(); };
  }, [word, id, link]);

  if (list === null) return null;
  if (!editable && list.length === 0) return null;

  const reset = () => { setWord(""); setMeaning(""); setLink(null); setSugs([]); setAdding(false); };

  const save = async () => {
    const w = word.trim();
    if (!w) return;
    setSaving(true);
    try {
      const entry: ConfusedEntry = { word: w, meaning: meaning.trim(), card_id: link?.id ?? null, card_table: link?.table ?? null };
      if (link && reciprocal) {
        const next = await mergeConfusionGroups({ table, id }, { table: link.table, id: link.id }, readMember, (ref, entries) => writeList(ref.table, ref.id, entries), entry);
        setList(next);
      } else {
        const fresh = await readList(table, id);
        const exists = fresh.some((e) => (entry.card_id && e.card_id === entry.card_id && e.card_table === entry.card_table) || e.word.toLowerCase() === w.toLowerCase());
        const next = exists ? fresh : [...fresh, entry];
        await writeList(table, id, next);
        setList(next);
      }
      toast.success(link && reciprocal ? "Linked on both cards" : "Added");
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (i: number) => {
    const next = list.filter((_, j) => j !== i);
    const gone = list[i];
    try {
      await writeList(table, id, next); setList(next);
      if (gone?.card_id && gone.card_table) {
        const other = await readList(gone.card_table, gone.card_id);
        const filtered = other.filter((e) => e.card_id !== id);
        if (filtered.length !== other.length) await writeList(gone.card_table, gone.card_id, filtered);
      }
    } catch (e: any) { toast.error(e?.message ?? "Could not remove"); }
  };

  return (
    <div className="text-sm border border-amber-500/40 bg-amber-500/10 rounded-md px-3 py-2 mt-3 text-left max-w-md mx-auto w-full">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 font-medium">
          <AlertTriangle className="h-3.5 w-3.5" /> Non confondere con
        </span>
        {editable && !adding && (
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add
          </Button>
        )}
      </div>

      {list.length === 0 && !adding && <p className="text-xs text-muted-foreground">No confusing words yet.</p>}

      <ul className="space-y-1">
        {list.map((e, i) => (
          <li key={`${e.word}-${i}`} className="flex items-center gap-1">
            <span className="font-medium inline-flex items-center gap-1">
              {e.card_id && <Link2 className="h-3 w-3 text-muted-foreground" />}
              {e.word}
            </span>
            <SpeakButton text={e.word} size="icon" variant="ghost" />
            <span className="flex-1 text-muted-foreground truncate">{e.meaning && `→ ${e.meaning}`}</span>
            {e.card_id && e.card_table && (
              <Button type="button" size="sm" variant="outline" className="h-7 px-2" onClick={() => setCompare(e)}>
                <Columns2 className="h-3.5 w-3.5 mr-1" /> Compare
              </Button>
            )}
            {editable && (
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove ${e.word}`} onClick={() => remove(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="mt-2 space-y-2">
          <div className="relative">
            <Input
              autoFocus
              value={word}
              placeholder="German word (type to find a card)…"
              onChange={(e) => { setWord(e.target.value); setLink(null); }}
            />
            {sugs.length > 0 && !link && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-56 overflow-y-auto">
                {sugs.map((s) => (
                  <button
                    type="button"
                    key={`${s.table}-${s.id}`}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent text-sm"
                    onClick={() => { setLink(s); setWord(s.word); setMeaning(s.meanings.join(", ")); setSugs([]); }}
                  >
                    <span className="font-medium">{s.word}</span>{" "}
                    <span className="text-xs text-muted-foreground">({s.label}) {s.meanings.slice(0, 2).join(", ")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input value={meaning} placeholder="Italian meaning / note" onChange={(e) => setMeaning(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} />
          {link ? (
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={reciprocal} onChange={(e) => setReciprocal(e.target.checked)} />
              Also add this card to “{link.word}”
            </label>
          ) : word.trim().length >= 2 ? (
            <p className="text-xs text-muted-foreground">Not linked to a card — saved as a note only.</p>
          ) : null}
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={reset}>Cancel</Button>
            <Button type="button" size="sm" onClick={save} disabled={saving || !word.trim()}>Save</Button>
          </div>
        </div>
      )}

      <CompareDialog
        open={!!compare}
        onOpenChange={(o) => !o && setCompare(null)}
        left={{ table, id }}
        right={compare?.card_id && compare.card_table ? { table: compare.card_table, id: compare.card_id } : null}
      />
    </div>
  );
}

function CardSummary({ table, row }: { table: CardTable; row: any }) {
  const w = headword(table, row);
  const forms: string[] = [];
  if (table === "nouns" && row.plural) forms.push(`Plural: die ${row.plural}`);
  if (table === "verbs") {
    if (row.praeteritum) forms.push(`Präteritum: ${row.praeteritum}`);
    if (row.perfect) forms.push(`Perfekt: ${row.perfect}`);
  }
  if (table === "words") {
    if (row.comparative) forms.push(`Komparativ: ${row.comparative}`);
    if (row.superlative_relative) forms.push(`Superlativ: ${row.superlative_relative}`);
  }
  return (
    <div className="rounded-md border p-3 space-y-2 min-w-0">
      <div className="flex items-center gap-1">
        <span className="text-xl font-bold break-words">{w}</span>
        <SpeakButton text={w} size="icon" variant="ghost" />
      </div>
      {forms.map((f) => <div key={f} className="text-sm text-muted-foreground">{f}</div>)}
      {table === "verbs" && row.conjugation && (
        <div className="text-xs text-muted-foreground whitespace-pre-wrap">Präsens: {row.conjugation}</div>
      )}
      <div className="flex flex-wrap gap-1">
        {(row.meanings ?? []).map((m: string) => (
          <span key={m} className="px-2 py-0.5 rounded-full border bg-muted text-sm">{m}</span>
        ))}
      </div>
      {(row.examples ?? []).length > 0 && (
        <div className="text-sm italic text-muted-foreground border-l-2 pl-2 space-y-1">
          {(row.examples as string[]).map((ex, i) => (
            <div key={i} className="flex items-start gap-1">
              <span className="flex-1">{ex}</span>
              <SpeakButton text={ex} size="icon" variant="ghost" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareDialog({
  open,
  onOpenChange,
  left,
  right,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  left: { table: CardTable; id: string };
  right: { table: CardTable; id: string } | null;
}) {
  const [rows, setRows] = useState<[any, any] | null>(null);
  useEffect(() => {
    if (!open || !right) return;
    setRows(null);
    Promise.all([fetchOneCard<any>(left.table, left.id), fetchOneCard<any>(right.table, right.id)]).then(([a, b]) => setRows([a, b]));
  }, [open, left.table, left.id, right?.table, right?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vergleichen</DialogTitle>
        </DialogHeader>
        {!rows ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !rows[1] ? (
          <p className="text-sm text-muted-foreground">The linked card no longer exists.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rows[0] && <CardSummary table={left.table} row={rows[0]} />}
             {right && <CardSummary table={right.table} row={rows[1]} />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
