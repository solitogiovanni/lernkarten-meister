import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/supabase-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Loader2, Plus, Trash2, Search, Pencil } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  title: string;
  content: string | null;
  updated_at: string;
};

type FormValue = { title: string; content: string };
const emptyValue: FormValue = { title: "", content: "" };

export const Route = createFileRoute("/grammar")({
  head: () => ({ meta: [{ title: "Grammar — Wortschatz" }] }),
  component: GrammarPage,
});

function GrammarPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [editValue, setEditValue] = useState<FormValue>(emptyValue);
  const [creating, setCreating] = useState(false);
  const [newValue, setNewValue] = useState<FormValue>(emptyValue);
  const [previewing, setPreviewing] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await fetchAll<Row>("grammar_notes", (q) =>
      q.select("id,title,content,updated_at").order("title", { ascending: true }),
    );
    if (error) toast.error(error.message);
    setRows(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      (r.title + " " + (r.content ?? "")).toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const openEdit = (r: Row) => {
    setEditing(r);
    setEditValue({ title: r.title, content: r.content ?? "" });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editValue.title.trim()) return toast.error("Title is required");
    const { error } = await (supabase as any)
      .from("grammar_notes")
      .update({ title: editValue.title.trim(), content: editValue.content || null })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const deleteEditing = async () => {
    if (!editing) return;
    if (!confirm(`Delete "${editing.title}"?`)) return;
    const { error } = await supabase.from("grammar_notes").delete().eq("id", editing.id);
    if (error) return toast.error(error.message);
    setEditing(null);
    load();
  };

  const createNew = async () => {
    if (!newValue.title.trim()) return toast.error("Title is required");
    const { error } = await (supabase as any).from("grammar_notes").insert({
      title: newValue.title.trim(),
      content: newValue.content || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setCreating(false);
    setNewValue(emptyValue);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-14 z-20 -mx-4 px-4 bg-background pt-2 pb-3 space-y-4 border-b">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Your grammar deck</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} {rows.length === 1 ? "rule" : "rules"}
            </p>
          </div>
          <Button onClick={() => setCreating(true)} className="flex-1 sm:flex-initial">
            <Plus className="h-4 w-4 mr-1" /> Add rule
          </Button>
        </div>

        <Card className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title or content…"
              className="pl-8"
            />
          </div>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          {rows.length === 0 ? "Your grammar deck is empty." : "No rules match your search."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <button key={r.id} onClick={() => setPreviewing(r)} className="text-left">
              <Card className="p-4 hover:border-primary transition-colors h-full">
                <div className="font-semibold text-lg mb-1 line-clamp-2">{r.title}</div>
                {r.content && (
                  <div
                    className="rich-text-view text-sm text-muted-foreground line-clamp-4 [&_*]:!text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: r.content }}
                  />
                )}
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Preview */}
      <Dialog open={!!previewing} onOpenChange={(o) => !o && setPreviewing(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          {previewing && (
            <>
              <div className="shrink-0">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Grammar rule</p>
                <h2 className="text-2xl font-bold tracking-tight">{previewing.title}</h2>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0 my-4">
                {previewing.content ? (
                  <div
                    className="rich-text-view text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: previewing.content }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">No notes yet.</p>
                )}
              </div>
              <DialogFooter className="sm:justify-between gap-2 shrink-0">
                <Button variant="outline" onClick={() => setPreviewing(null)}>
                  Close
                </Button>
                <Button
                  onClick={() => {
                    const r = previewing;
                    setPreviewing(null);
                    openEdit(r);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit drawer */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit rule</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={editValue.title}
                onChange={(e) => setEditValue({ ...editValue, title: e.target.value })}
                placeholder="z.B. Trennbare Verben"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <RichTextEditor
                value={editValue.content}
                onChange={(content) => setEditValue({ ...editValue, content })}
              />
            </div>
            <div className="flex justify-between mt-6 gap-2">
              <Button variant="ghost" size="sm" onClick={deleteEditing}>
                <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Delete
              </Button>
              <Button onClick={saveEdit}>Save</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create drawer */}
      <Sheet open={creating} onOpenChange={(o) => { setCreating(o); if (!o) setNewValue(emptyValue); }}>
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Add rule</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={newValue.title}
                onChange={(e) => setNewValue({ ...newValue, title: e.target.value })}
                placeholder="z.B. Trennbare Verben"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <RichTextEditor
                value={newValue.content}
                onChange={(content) => setNewValue({ ...newValue, content })}
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={createNew}>Add</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
