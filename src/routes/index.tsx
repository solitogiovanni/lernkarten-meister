import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NounForm, type NounFormValue, emptyNoun } from "@/components/NounForm";
import { Loader2, Plus, Sparkles, Trash2, Upload, Play, Search } from "lucide-react";
import { toast } from "sonner";
import { isDue } from "@/lib/srs";
import { autofillNouns } from "@/server/autofill.functions";
import { useServerFn } from "@tanstack/react-start";

type NounRow = {
  id: string;
  article: "der" | "die" | "das" | null;
  noun: string;
  plural: string | null;
  meanings: string[];
  examples: string[];
  themes: string[];
  due_at: string;
  reps: number;
};

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  theme: fallback(z.string(), "").default(""),
  due: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [{ title: "Deck — Wortschatz" }, { name: "description", content: "Your German noun deck." }],
  }),
  component: DeckPage,
});

const articleColor = {
  der: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  die: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  das: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

function DeckPage() {
  const { q, theme, due } = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const [rows, setRows] = useState<NounRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<NounRow | null>(null);
  const [editValue, setEditValue] = useState<NounFormValue>(emptyNoun);
  const [creating, setCreating] = useState(false);
  const [newValue, setNewValue] = useState<NounFormValue>(emptyNoun);
  const [aiBusy, setAiBusy] = useState(false);
  const autofillFn = useServerFn(autofillNouns);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("nouns")
      .select("id,article,noun,plural,meanings,examples,themes,due_at,reps")
      .order("noun", { ascending: true })
      .limit(1000);
    if (error) toast.error(error.message);
    setRows((data ?? []) as NounRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const allThemes = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) for (const t of r.themes) set.add(t);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (q) {
        const needle = q.toLowerCase();
        const hay = [r.noun, r.plural ?? "", ...r.meanings].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (theme && !r.themes.includes(theme)) return false;
      if (due && !isDue(r.due_at)) return false;
      return true;
    });
  }, [rows, q, theme, due]);

  const dueCount = rows.filter((r) => isDue(r.due_at)).length;

  const openEdit = (r: NounRow) => {
    setEditing(r);
    setEditValue({
      article: r.article,
      noun: r.noun,
      plural: r.plural ?? "",
      meanings: r.meanings,
      examples: r.examples,
      themes: r.themes,
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editValue.noun.trim()) return toast.error("Noun is required");
    const { error } = await supabase
      .from("nouns")
      .update({
        article: editValue.article,
        noun: editValue.noun.trim(),
        plural: editValue.plural.trim() || null,
        meanings: editValue.meanings,
        examples: editValue.examples.filter((x) => x.trim()),
        themes: editValue.themes,
      })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const deleteEditing = async () => {
    if (!editing) return;
    if (!confirm(`Delete "${editing.noun}"?`)) return;
    const { error } = await supabase.from("nouns").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null);
    load();
  };

  const createNew = async () => {
    if (!newValue.noun.trim()) return toast.error("Noun is required");
    const { error } = await supabase.from("nouns").insert({
      article: newValue.article,
      noun: newValue.noun.trim(),
      plural: newValue.plural.trim() || null,
      meanings: newValue.meanings,
      examples: newValue.examples.filter((x) => x.trim()),
      themes: newValue.themes,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setCreating(false);
    setNewValue(emptyNoun);
    load();
  };

  const aiFillCurrent = async (target: "edit" | "new") => {
    const v = target === "edit" ? editValue : newValue;
    if (!v.noun.trim()) return toast.error("Type a noun first");
    setAiBusy(true);
    try {
      const { results, error } = await autofillFn({ data: { nouns: [v.noun.trim()] } });
      if (error) return toast.error(error);
      const r = results[0];
      if (!r) return toast.error("No result");
      const merged: NounFormValue = {
        article: v.article ?? r.article,
        noun: r.noun || v.noun,
        plural: v.plural || r.plural || "",
        meanings: v.meanings.length ? v.meanings : r.meanings,
        examples: v.examples,
        themes: v.themes.length ? v.themes : r.themes,
      };
      if (target === "edit") setEditValue(merged);
      else setNewValue(merged);
      toast.success("Filled with AI");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your noun deck</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? "noun" : "nouns"} · {dueCount} due today
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/import">
              <Upload className="h-4 w-4 mr-1" /> Import list
            </Link>
          </Button>
          <Button asChild>
            <Link to="/campaign">
              <Play className="h-4 w-4 mr-1" /> Campaign
            </Link>
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1" /> Add noun
          </Button>
        </div>
      </div>

      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => navigate({ search: (p: { q: string; theme: string; due: boolean }) => ({ ...p, q: e.target.value }) })}
              placeholder="Search noun, plural, meaning…"
              className="pl-8"
            />
          </div>
          <Button
            variant={due ? "default" : "outline"}
            size="sm"
            onClick={() => navigate({ search: (p: { q: string; theme: string; due: boolean }) => ({ ...p, due: !p.due }) })}
          >
            Due today ({dueCount})
          </Button>
          {(q || theme || due) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ search: { q: "", theme: "", due: false } })}
            >
              Clear
            </Button>
          )}
        </div>
        {allThemes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {allThemes.map((t) => (
              <button
                key={t}
                onClick={() => navigate({ search: (p: { q: string; theme: string; due: boolean }) => ({ ...p, theme: p.theme === t ? "" : t }) })}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  theme === t
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          {rows.length === 0 ? (
            <>
              <p className="mb-3">Your deck is empty.</p>
              <Button asChild>
                <Link to="/import">
                  <Upload className="h-4 w-4 mr-1" /> Import a list
                </Link>
              </Button>
            </>
          ) : (
            "No nouns match your filters."
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <button
              key={r.id}
              onClick={() => openEdit(r)}
              className="text-left"
            >
              <Card className="p-4 hover:border-primary transition-colors h-full">
                <div className="flex items-baseline gap-2 mb-1">
                  {r.article && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${articleColor[r.article]} font-medium`}>
                      {r.article}
                    </span>
                  )}
                  <span className="font-semibold text-lg">{r.noun}</span>
                  {r.plural && <span className="text-sm text-muted-foreground">/ {r.plural}</span>}
                </div>
                {r.meanings.length > 0 && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {r.meanings.join(", ")}
                  </p>
                )}
                {r.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.themes.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px] py-0">
                        {t}
                      </Badge>
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

      {/* Edit drawer */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Edit noun</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <NounForm value={editValue} onChange={setEditValue} themeSuggestions={allThemes} />
            <div className="flex justify-between mt-6 gap-2">
              <Button variant="ghost" size="sm" onClick={deleteEditing}>
                <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                Delete
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

      {/* Create drawer */}
      <Sheet open={creating} onOpenChange={(o) => { setCreating(o); if (!o) setNewValue(emptyNoun); }}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Add noun</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <NounForm value={newValue} onChange={setNewValue} themeSuggestions={allThemes} />
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => aiFillCurrent("new")} disabled={aiBusy || !newValue.noun.trim()}>
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
