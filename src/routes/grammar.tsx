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
import { Loader2, Plus, Trash2, Search, Pencil, Pin, PinOff, ArrowUp, ArrowDown, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { GRAMMAR_PREFILL_KEY } from "@/components/CrossDeckSearch";

type Row = {
  id: string;
  title: string;
  content: string | null;
  updated_at: string;
  pinned: boolean;
  sort_order: number | null;
  folder_id: string | null;
};

type Folder = { id: string; name: string; color: string; sort_order: number | null };

const FOLDER_COLORS = ["#10b981", "#0ea5e9", "#6366f1", "#8b5cf6", "#f59e0b", "#f43f5e", "#14b8a6", "#64748b"];

type FormValue = { title: string; content: string; folder_id: string | null };
const emptyValue: FormValue = { title: "", content: "", folder_id: null };

export const Route = createFileRoute("/grammar")({
  head: () => ({
    meta: [
      { title: "Grammar — Wortschatz" },
      { name: "description", content: "Your German grammar rules, organized in colored folders." },
      { property: "og:title", content: "Grammar — Wortschatz" },
      { property: "og:description", content: "Your German grammar rules, organized in colored folders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GrammarPage,
});

function FolderChip({
  label,
  count,
  color,
  active,
  onClick,
  onEdit,
}: {
  label: string;
  count: number;
  color?: string;
  active: boolean;
  onClick: () => void;
  onEdit?: () => void;
}) {
  return (
    <div
      className={`shrink-0 inline-flex items-center rounded-full border h-8 text-sm transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
    >
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 pl-3 pr-2 h-full">
        {color && <span className="h-2.5 w-2.5 rounded-full ring-1 ring-background" style={{ backgroundColor: color }} />}
        <span className="whitespace-nowrap">{label}</span>
        <span className={`text-xs ${active ? "opacity-80" : "text-muted-foreground"}`}>{count}</span>
      </button>
      {onEdit && active && (
        <button type="button" onClick={onEdit} aria-label={`Edit folder ${label}`} className="pr-2.5 pl-0.5 h-full">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      {!(onEdit && active) && <span className="w-1" />}
    </div>
  );
}

function GrammarPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [editValue, setEditValue] = useState<FormValue>(emptyValue);
  const [creating, setCreating] = useState(false);
  const [newValue, setNewValue] = useState<FormValue>(emptyValue);
  const [previewing, setPreviewing] = useState<Row | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [folderDialog, setFolderDialog] = useState<{ id?: string; name: string; color: string } | null>(null);
  const [cols, setCols] = useState<1 | 2 | 3>(1);
  useEffect(() => {
    const v = Number(localStorage.getItem("wortschatz:grammar_columns"));
    if (v === 1 || v === 2 || v === 3) setCols(v);
    else setCols(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
  }, []);
  const changeCols = (n: 1 | 2 | 3) => {
    setCols(n);
    localStorage.setItem("wortschatz:grammar_columns", String(n));
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await fetchAll<Row>("grammar_notes", (q) =>
      q.select("id,title,content,updated_at,pinned,sort_order,folder_id").order("title", { ascending: true }),
    );
    if (error) toast.error(error.message);
    setRows(sortRows(data));
    setLoading(false);
  };

  const loadFolders = async () => {
    const { data, error } = await (supabase as any)
      .from("grammar_folders")
      .select("id,name,color,sort_order")
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("name");
    if (error) toast.error(error.message);
    setFolders(data ?? []);
  };

  useEffect(() => {
    load();
    loadFolders();
  }, []);

  // New rule defaults to the folder being viewed
  useEffect(() => {
    if (creating && !newValue.folder_id && activeFolder !== "all" && activeFolder !== "none") {
      setNewValue((v) => ({ ...v, folder_id: activeFolder }));
    }
  }, [creating]);

  useEffect(() => {
    const title = sessionStorage.getItem(GRAMMAR_PREFILL_KEY)?.trim();
    if (!title) return;
    sessionStorage.removeItem(GRAMMAR_PREFILL_KEY);
    setNewValue({ title, content: "" });
    setCreating(true);
  }, []);

  const sortRows = (list: Row[]) =>
    [...list].sort((a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9) ||
      a.title.localeCompare(b.title),
    );

  const togglePin = async (r: Row) => {
    const pinned = !r.pinned;
    setRows((l) => sortRows(l.map((x) => (x.id === r.id ? { ...x, pinned } : x))));
    const { error } = await (supabase as any).from("grammar_notes").update({ pinned }).eq("id", r.id);
    if (error) { toast.error(error.message); load(); }
  };

  const move = async (r: Row, dir: -1 | 1) => {
    const group = filtered.filter((x) => x.pinned === r.pinned);
    const i = group.findIndex((x) => x.id === r.id);
    const j = i + dir;
    if (j < 0 || j >= group.length) return;
    const other = group[j];
    let a = r.sort_order ?? i + 1;
    let b = other.sort_order ?? j + 1;
    if (a === b) b = a + dir;
    const updates = [
      { id: r.id, sort_order: b },
      { id: other.id, sort_order: a },
    ];
    setRows((l) => sortRows(l.map((x) => {
      const u = updates.find((u) => u.id === x.id);
      return u ? { ...x, sort_order: u.sort_order } : x;
    })));
    const results = await Promise.all(
      updates.map((u) => (supabase as any).from("grammar_notes").update({ sort_order: u.sort_order }).eq("id", u.id)),
    );
    const err = results.find((x: any) => x.error);
    if (err) { toast.error(err.error.message); load(); }
  };

  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);

  const filtered = useMemo(() => {
    let list = rows;
    if (activeFolder === "none") list = list.filter((r) => !r.folder_id);
    else if (activeFolder !== "all") list = list.filter((r) => r.folder_id === activeFolder);
    if (!q) return list;
    const needle = q.toLowerCase();
    return list.filter((r) =>
      (r.title + " " + (r.content ?? "")).toLowerCase().includes(needle),
    );
  }, [rows, q, activeFolder]);

  const saveFolder = async () => {
    if (!folderDialog) return;
    const name = folderDialog.name.trim();
    if (!name) return toast.error("Name is required");
    const db = (supabase as any).from("grammar_folders");
    const { error } = folderDialog.id
      ? await db.update({ name, color: folderDialog.color }).eq("id", folderDialog.id)
      : await db.insert({ name, color: folderDialog.color, sort_order: folders.length + 1 });
    if (error) return toast.error(error.message);
    setFolderDialog(null);
    loadFolders();
  };

  const deleteFolder = async () => {
    if (!folderDialog?.id) return;
    if (!confirm(`Delete folder "${folderDialog.name}"? Its notes are kept and become unassigned.`)) return;
    const { error } = await (supabase as any).from("grammar_folders").delete().eq("id", folderDialog.id);
    if (error) return toast.error(error.message);
    if (activeFolder === folderDialog.id) setActiveFolder("all");
    setFolderDialog(null);
    await loadFolders();
    load();
  };

  const openEdit = (r: Row) => {
    setEditing(r);
    setEditValue({ title: r.title, content: r.content ?? "", folder_id: r.folder_id });
  };

  const saveEdit = async (close = true) => {
    if (!editing) return;
    if (!editValue.title.trim()) return toast.error("Title is required");
    const { error } = await (supabase as any)
      .from("grammar_notes")
      .update({ title: editValue.title.trim(), content: editValue.content || null, folder_id: editValue.folder_id })
      .eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    if (close) setEditing(null);
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
      folder_id: newValue.folder_id,
      sort_order: rows.reduce((m, r) => Math.max(m, r.sort_order ?? 0), 0) + 1,
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
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">Your grammar deck</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} {rows.length === 1 ? "rule" : "rules"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Columns">
              {([1, 2, 3] as const).map((n) => (
                <Button
                  key={n}
                  size="sm"
                  variant={cols === n ? "default" : "ghost"}
                  className="h-8 w-8 px-0"
                  aria-label={`${n} column${n > 1 ? "s" : ""}`}
                  aria-pressed={cols === n}
                  onClick={() => changeCols(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
            <Button onClick={() => setCreating(true)} size="icon" className="sm:hidden" aria-label="Add rule">
              <Plus className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCreating(true)} className="hidden sm:inline-flex">
              <Plus className="h-4 w-4 mr-1" /> Add rule
            </Button>
          </div>
        </div>

        <Card className="p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title or content…"
              className="pl-8 h-11 text-base sm:h-9 sm:text-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto mt-3 pb-1 -mx-1 px-1">
            <FolderChip label="All rules" count={rows.length} active={activeFolder === "all"} onClick={() => setActiveFolder("all")} />
            {folders.map((f) => (
              <FolderChip
                key={f.id}
                label={f.name}
                color={f.color}
                count={rows.filter((r) => r.folder_id === f.id).length}
                active={activeFolder === f.id}
                onClick={() => setActiveFolder(f.id)}
                onEdit={() => setFolderDialog({ id: f.id, name: f.name, color: f.color })}
              />
            ))}
            {rows.some((r) => !r.folder_id) && folders.length > 0 && (
              <FolderChip
                label="Unassigned"
                count={rows.filter((r) => !r.folder_id).length}
                active={activeFolder === "none"}
                onClick={() => setActiveFolder("none")}
              />
            )}
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8 border-dashed"
              onClick={() => setFolderDialog({ name: "", color: FOLDER_COLORS[0] })}
            >
              <FolderPlus className="h-4 w-4 mr-1" /> Folder
            </Button>
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
        <div className={`grid gap-3 ${cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {filtered.map((r) => (
            <div key={r.id} role="button" tabIndex={0} onClick={() => setPreviewing(r)} className="text-left cursor-pointer">
              <Card className={`p-4 hover:border-primary transition-colors h-full ${r.pinned ? "border-primary/60 bg-primary/5" : ""}`}>
                <div className="flex items-start gap-2 mb-1">
                  <div className="font-semibold text-lg line-clamp-2 flex-1">{r.title}</div>
                  <div className="flex shrink-0 -mr-2 -mt-1" onClick={(e) => e.stopPropagation()}>
                    {!q && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Move up" onClick={() => move(r, -1)}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Move down" onClick={() => move(r, 1)}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={r.pinned ? "Unpin" : "Pin to top"} onClick={() => togglePin(r)}>
                      {r.pinned ? <PinOff className="h-4 w-4 text-primary" /> : <Pin className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {activeFolder === "all" && r.folder_id && folderById.get(r.folder_id) && (
                  <span className="inline-flex items-center gap-1.5 text-xs rounded-full border px-2 py-0.5 mb-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: folderById.get(r.folder_id)!.color }} />
                    {folderById.get(r.folder_id)!.name}
                  </span>
                )}
                {r.content && (
                  <div
                    className="rich-text-view text-sm text-muted-foreground line-clamp-4 [&_*]:!text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(r.content) }}
                  />
                )}
              </Card>
            </div>
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
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(previewing.content) }}
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
            <FolderSelect folders={folders} value={editValue.folder_id} onChange={(folder_id) => setEditValue({ ...editValue, folder_id })} />
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <RichTextEditor
                value={editValue.content}
                onChange={(content) => setEditValue({ ...editValue, content })}
              />
            </div>
            <div className="flex justify-start mt-6 gap-2">
              <Button variant="outline" onClick={() => saveEdit(false)}>
                Save
              </Button>
              <Button onClick={() => saveEdit(true)}>
                Save & close
              </Button>
              <Button variant="outline" onClick={deleteEditing}>
                <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Delete
              </Button>
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
            <FolderSelect folders={folders} value={newValue.folder_id} onChange={(folder_id) => setNewValue({ ...newValue, folder_id })} />
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <RichTextEditor
                value={newValue.content}
                onChange={(content) => setNewValue({ ...newValue, content })}
              />
            </div>
            <div className="flex justify-start gap-2 mt-6">
              <Button onClick={createNew}>Add</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Folder dialog */}
      <Dialog open={!!folderDialog} onOpenChange={(o) => !o && setFolderDialog(null)}>
        <DialogContent className="max-w-sm">
          {folderDialog && (
            <>
              <h2 className="text-lg font-semibold">{folderDialog.id ? "Edit folder" : "New folder"}</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    autoFocus
                    value={folderDialog.name}
                    onChange={(e) => setFolderDialog({ ...folderDialog, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && saveFolder()}
                    placeholder="z.B. Nebensätze"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {FOLDER_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Color ${c}`}
                        onClick={() => setFolderDialog({ ...folderDialog, color: c })}
                        className={`h-8 w-8 rounded-full border-2 ${folderDialog.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="sm:justify-start gap-2">
                <Button onClick={saveFolder}>Save</Button>
                {folderDialog.id && (
                  <Button variant="outline" onClick={deleteFolder}>
                    <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Delete
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderSelect({
  folders,
  value,
  onChange,
}: {
  folders: Folder[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>Folder</Label>
      <select
        className="w-full h-10 rounded-md border bg-background px-3 text-sm"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">No folder</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
    </div>
  );
}
