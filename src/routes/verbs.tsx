import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/supabase-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VerbForm, type VerbFormValue, type VerbPrep, emptyVerb } from "@/components/VerbForm";
import { Loader2, Plus, Trash2, Upload, Play, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { isDue } from "@/lib/srs";
import { autofillVerbs } from "@/lib/autofill.functions";
import { useServerFn } from "@tanstack/react-start";
import { SpeakButton } from "@/components/SpeakButton";
import { CardRevealDialog } from "@/components/CardReveal";
import { CrossDeckSearch, ADD_PREFILL_KEY, EDIT_PREFILL_KEY } from "@/components/CrossDeckSearch";

export const Route = createFileRoute("/verbs")({
  head: () => ({
    meta: [
      { title: "Verbs — Wortschatz" },
      { name: "description", content: "Your German verb deck." },
    ],
  }),
  component: VerbsPage,
});

type Row = {
  id: string;
  present: string;
  praeteritum: string | null;
  perfect: string | null;
  conjugation: string | null;
  prepositions: VerbPrep[];
  meanings: string[];
  examples: string[];
  themes: string[];
  comments: string | null;
  due_at: string;
  reps: number;
};

function VerbsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [theme, setTheme] = useState("");
  const [themeFilter, setThemeFilter] = useState("");
  const [due, setDue] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [previewing, setPreviewing] = useState<Row | null>(null);
  const [editValue, setEditValue] = useState<VerbFormValue>(emptyVerb);
  const [creating, setCreating] = useState(false);
  const [newValue, setNewValue] = useState<VerbFormValue>(emptyVerb);
  const [aiBusy, setAiBusy] = useState(false);
  const autofillFn = useServerFn(autofillVerbs);

  const aiFillCurrent = async (target: "edit" | "new") => {
    const v = target === "edit" ? editValue : newValue;
    if (!v.present.trim()) return toast.error("Type a verb first");
    setAiBusy(true);
    try {
      const { results, error } = await autofillFn({ data: { verbs: [v.present.trim()] } });
      if (error) return toast.error(error);
      const r = results[0];
      if (!r) return toast.error("No result");
      const merged: VerbFormValue = {
        present: r.present || v.present,
        praeteritum: v.praeteritum || r.praeteritum || "",
        perfect: v.perfect || r.perfect || "",
        conjugation: v.conjugation || r.conjugation || "",
        prepositions: v.prepositions.length ? v.prepositions : (r.prepositions ?? []),
        meanings: v.meanings.length ? v.meanings : r.meanings ?? [],
        examples: v.examples.length ? v.examples : r.examples ?? [],
        themes: v.themes.length ? v.themes : r.themes ?? [],
        comments: v.comments,
      };
      if (target === "edit") setEditValue(merged);
      else setNewValue(merged);
      toast.success("Filled with AI");
    } finally {
      setAiBusy(false);
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await fetchAll<Row>("verbs", (q) =>
      q.select("id,present,praeteritum,perfect,conjugation,prepositions,meanings,examples,themes,comments,due_at,reps")
        .order("present", { ascending: true }),
    );
    if (error) toast.error(error.message);
    setRows(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(ADD_PREFILL_KEY);
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as { kind: string; word: string };
      if (p.kind === "verb" && p.word) {
        setNewValue({ ...emptyVerb, present: p.word });
        setCreating(true);
      }
    } catch {}
    sessionStorage.removeItem(ADD_PREFILL_KEY);
  }, []);

  useEffect(() => {
    if (loading || rows.length === 0) return;
    const raw = sessionStorage.getItem(EDIT_PREFILL_KEY);
    if (!raw) return;
    try {
      const p = JSON.parse(raw) as { kind: string; id: string };
      if (p.kind === "verb" && p.id) {
        const r = rows.find((x) => x.id === p.id);
        if (r) openEdit(r);
      }
    } catch {}
    sessionStorage.removeItem(EDIT_PREFILL_KEY);
  }, [loading, rows]);

  const allThemes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const t of r.themes) set.add(t);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q) {
        const needle = q.toLowerCase();
        const hay = [
          r.present,
          r.praeteritum ?? "",
          r.perfect ?? "",
          ...r.meanings,
          ...(r.prepositions ?? []).map((p) => p.meaning ?? ""),
        ].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (theme && !r.themes.includes(theme)) return false;
      if (due && !isDue(r.due_at)) return false;
      return true;
    });
  }, [rows, q, theme, due]);

  const dueCount = rows.filter((r) => isDue(r.due_at)).length;

  const openEdit = (r: Row) => {
    setEditing(r);
    setEditValue({
      present: r.present,
      praeteritum: r.praeteritum ?? "",
      perfect: r.perfect ?? "",
      conjugation: r.conjugation ?? "",
      prepositions: r.prepositions ?? [],
      meanings: r.meanings,
      examples: r.examples,
      themes: r.themes,
      comments: r.comments ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editValue.present.trim()) return toast.error("Present is required");
    const { error } = await (supabase as any)
      .from("verbs")
      .update({
        present: editValue.present.trim(),
        praeteritum: editValue.praeteritum.trim() || null,
        perfect: editValue.perfect.trim() || null,
        conjugation: editValue.conjugation.trim() || null,
        prepositions: editValue.prepositions.filter((p) => p.preposition.trim()),
        meanings: editValue.meanings,
        examples: editValue.examples.filter((x) => x.trim()),
        themes: editValue.themes,
        comments: editValue.comments.trim() || null,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const deleteEditing = async () => {
    if (!editing) return;
    if (!confirm(`Delete "${editing.present}"?`)) return;
    const { error } = await (supabase as any).from("verbs").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null);
    load();
  };

  const createNew = async () => {
    if (!newValue.present.trim()) return toast.error("Present is required");
    const key = newValue.present.trim().toLowerCase();
    if (rows.some((r) => r.present.trim().toLowerCase() === key)) {
      return toast.error(`"${newValue.present.trim()}" is already in your deck`);
    }
    const { error } = await (supabase as any).from("verbs").insert({
      present: newValue.present.trim(),
      praeteritum: newValue.praeteritum.trim() || null,
      perfect: newValue.perfect.trim() || null,
      conjugation: newValue.conjugation.trim() || null,
      prepositions: newValue.prepositions.filter((p) => p.preposition.trim()),
      meanings: newValue.meanings,
      examples: newValue.examples.filter((x) => x.trim()),
      themes: newValue.themes,
      comments: newValue.comments.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setCreating(false);
    setNewValue(emptyVerb);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-4 px-4 bg-background pt-2 pb-3 space-y-4 border-b max-h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your verb deck</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "entry" : "entries"} · {dueCount} due today
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" asChild className="flex-1 sm:flex-initial">
            <Link to="/import/verbs"><Upload className="h-4 w-4 mr-1" /> Import</Link>
          </Button>
          <Button asChild className="flex-1 sm:flex-initial">
            <Link to="/campaign"><Play className="h-4 w-4 mr-1" /> Campaign</Link>
          </Button>
          <Button onClick={() => setCreating(true)} className="flex-1 sm:flex-initial">
            <Plus className="h-4 w-4 mr-1" /> Add verb
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search verb, meaning…" className="pl-8" />
          </div>
          <Button variant={due ? "default" : "outline"} size="sm" onClick={() => setDue(!due)}>
            Due today ({dueCount})
          </Button>
          {(q || theme || due) && (
            <Button variant="ghost" size="sm" onClick={() => { setQ(""); setTheme(""); setDue(false); }}>Clear</Button>
          )}
        </div>
        {allThemes.length > 0 && (
          <details className="mt-3 group">
            <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground inline-flex items-center gap-1">
              <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
              Themes {theme && <span className="ml-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground">{theme}</span>}
            </summary>
            <Input
              value={themeFilter}
              onChange={(e) => setThemeFilter(e.target.value)}
              placeholder="Filter themes…"
              className="mt-2 h-8 text-xs"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {allThemes.filter((t) => t.toLowerCase().includes(themeFilter.toLowerCase())).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(theme === t ? "" : t)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                    theme === t ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </details>
        )}
      </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          {rows.length === 0 ? (
            <>
              <p className="mb-3">Your verb deck is empty.</p>
              <Button asChild>
                <Link to="/import/verbs"><Upload className="h-4 w-4 mr-1" /> Import a list</Link>
              </Button>
            </>
          ) : "No entries match your filters."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <button key={r.id} onClick={() => setPreviewing(r)} className="text-left">
              <Card className="p-4 hover:border-primary transition-colors h-full">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-lg">{r.present}</div>
                  <SpeakButton
                    text={[r.present, r.praeteritum, r.perfect].filter(Boolean).join(", ")}
                    className="ml-auto"
                  />
                </div>
                {(r.praeteritum || r.perfect) && (
                  <div className="text-xs text-muted-foreground">
                    {r.praeteritum && <span>{r.praeteritum}</span>}
                    {r.praeteritum && r.perfect && <span> · </span>}
                    {r.perfect && <span>{r.perfect}</span>}
                  </div>
                )}
                {r.meanings.length > 0 && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.meanings.join(", ")}</p>
                )}
                {r.prepositions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.prepositions.map((p, i) => (
                      <Badge key={i} variant="outline" className="text-[10px] py-0">
                        {p.preposition}{p.case ? ` +${p.case}` : ""}
                      </Badge>
                    ))}
                  </div>
                )}
                {r.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.themes.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px] py-0">{t}</Badge>
                    ))}
                  </div>
                )}
                {isDue(r.due_at) && r.reps > 0 && (
                  <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">● due for review</div>
                )}
              </Card>
            </button>
          ))}
        </div>
      )}

      <CrossDeckSearch q={q} currentKind="verb" hasLocalMatches={filtered.length > 0} onProposeAdd={(_, word) => { setNewValue({ ...emptyVerb, present: word }); setCreating(true); }} />

      <CardRevealDialog
        open={!!previewing}
        onOpenChange={(o) => !o && setPreviewing(null)}
        card={previewing ? {
          kind: "verb",
          word: previewing.present,
          praeteritum: previewing.praeteritum,
          perfect: previewing.perfect,
          conjugation: previewing.conjugation,
          prepositions: previewing.prepositions,
          meanings: previewing.meanings,
          examples: previewing.examples,
          themes: previewing.themes,
          comments: previewing.comments,
        } : null}
        onEdit={() => {
          if (previewing) {
            const r = previewing;
            setPreviewing(null);
            openEdit(r);
          }
        }}
      />

      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle>Edit verb</SheetTitle></SheetHeader>
          <div className="mt-4">
            <VerbForm value={editValue} onChange={setEditValue} themeSuggestions={allThemes} />
            <div className="flex justify-between mt-6 gap-2">
              <Button variant="ghost" size="sm" onClick={deleteEditing}>
                <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Delete
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => aiFillCurrent("edit")} disabled={aiBusy}>
                  {aiBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                  AI fill
                </Button>
                <Button onClick={saveEdit}>Save</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={creating} onOpenChange={(o) => { setCreating(o); if (!o) setNewValue(emptyVerb); }}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader><SheetTitle>Add verb</SheetTitle></SheetHeader>
          <div className="mt-4">
            <VerbForm value={newValue} onChange={setNewValue} themeSuggestions={allThemes} />
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => aiFillCurrent("new")} disabled={aiBusy || !newValue.present.trim()}>
                {aiBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                AI fill
              </Button>
              <Button onClick={createNew}>Add</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
