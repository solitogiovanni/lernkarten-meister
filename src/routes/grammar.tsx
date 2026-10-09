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
import { Loader2, Plus, Trash2, Pencil, Pin, PinOff, ArrowUp, ArrowDown, FolderPlus, ListTree, X } from "lucide-react";
import { toast } from "sonner";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { GRAMMAR_PREFILL_KEY } from "@/components/CrossDeckSearch";
import { SearchField } from "@/components/SearchField";
import { fold } from "@/lib/normalize";

type Row = {
  id: string;
  title: string;
  content: string | null;
  updated_at: string;
  pinned: boolean;
  sort_order: number | null;
  folder_id: string | null;
  tags: string[];
};

type Folder = { id: string; name: string; color: string; sort_order: number | null };

const FOLDER_COLORS = [
  "#10b981", "#0ea5e9", "#6366f1", "#8b5cf6", "#f59e0b", "#f43f5e", "#14b8a6", "#64748b",
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#06b6d4", "#d946ef", "#a16207",
];

type FormValue = { title: string; content: string; folder_id: string | null; tags: string[] };
const emptyValue: FormValue = { title: "", content: "", folder_id: null, tags: [] };

function stripHtml(html: string): string {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// Per-character fold (length-preserving) used to locate matches for highlighting.
const foldChar = (c: string) => {
  const l = c.toLowerCase();
  if (l === "ß") return "s";
  return l.normalize("NFD").replace(/[\u0300-\u036f]/g, "") || l;
};
const foldKeep = (s: string) => Array.from(s).map(foldChar).join("");

function findMatch(text: string, needle: string): number {
  const n = foldKeep(needle.trim());
  if (!n) return -1;
  return foldKeep(text).indexOf(n);
}

function snippet(text: string, needle: string, radius = 70): string {
  const i = findMatch(text, needle);
  if (i < 0) return text.slice(0, radius * 2) + (text.length > radius * 2 ? "…" : "");
  const start = Math.max(0, i - radius);
  const end = Math.min(text.length, i + needle.trim().length + radius);
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
}

function Highlight({ text, needle }: { text: string; needle: string }) {
  const n = needle.trim();
  if (!n) return <>{text}</>;
  const folded = foldKeep(text);
  const fn = foldKeep(n);
  const parts: React.ReactNode[] = [];
  let pos = 0;
  let i = folded.indexOf(fn);
  while (i >= 0 && fn.length > 0) {
    if (i > pos) parts.push(text.slice(pos, i));
    parts.push(<mark key={i} className="bg-green-500/30 text-green-900 dark:text-green-100 rounded px-0.5">{text.slice(i, i + fn.length)}</mark>);
    pos = i + fn.length;
    i = folded.indexOf(fn, pos);
  }
  parts.push(text.slice(pos));
  return <>{parts}</>;
}

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
  const [scope, setScope] = useState<"folder" | "all">("folder");
  const [outlineOpen, setOutlineOpen] = useState(false);
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
      q.select("id,title,content,updated_at,pinned,sort_order,folder_id,tags").order("title", { ascending: true }),
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
    setNewValue({ title, content: "", folder_id: null, tags: [] });
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
    const searchAll = !!q.trim() && scope === "all";
    if (!searchAll) {
      if (activeFolder === "none") list = list.filter((r) => !r.folder_id);
      else if (activeFolder !== "all") list = list.filter((r) => r.folder_id === activeFolder);
    }
    const needle = fold(q.trim());
    if (!needle) return list;
    return list.filter((r) =>
      fold(r.title + " " + (r.tags ?? []).join(" ") + " " + stripHtml(r.content ?? "")).includes(needle),
    );
  }, [rows, q, activeFolder, scope]);

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
    setEditValue({ title: r.title, content: r.content ?? "", folder_id: r.folder_id, tags: r.tags ?? [] });
  };

  const saveEdit = async (close = true) => {
    if (!editing) return;
    if (!editValue.title.trim()) return toast.error("Title is required");
    const { error } = await (supabase as any)
      .from("grammar_notes")
      .update({ title: editValue.title.trim(), content: editValue.content || null, folder_id: editValue.folder_id, tags: editValue.tags })
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
      tags: newValue.tags,
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
          <div className="flex gap-2">
            <SearchField
              value={q}
              onChange={setQ}
              placeholder="Search title, notes or tags…"
            />
            <Button variant="outline" className="h-11 sm:h-9 shrink-0" onClick={() => setOutlineOpen(true)} aria-label="Outline">
              <ListTree className="h-4 w-4 sm:mr-1" /> <span className="hidden sm:inline">Outline</span>
            </Button>
          </div>
          {q && activeFolder !== "all" && (
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span className="text-muted-foreground">Search in</span>
              <div className="inline-flex rounded-md border p-0.5">
                <Button size="sm" variant={scope === "folder" ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setScope("folder")}>This folder</Button>
                <Button size="sm" variant={scope === "all" ? "default" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setScope("all")}>All folders</Button>
              </div>
            </div>
          )}
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
                  <div className="font-semibold text-lg line-clamp-2 flex-1"><Highlight text={r.title} needle={q} /></div>
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
                {(activeFolder === "all" || (q && scope === "all")) && r.folder_id && folderById.get(r.folder_id) && (
                  <span className="inline-flex items-center gap-1.5 text-xs rounded-full border px-2 py-0.5 mb-2 mr-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: folderById.get(r.folder_id)!.color }} />
                    {folderById.get(r.folder_id)!.name}
                  </span>
                )}
                {r.tags?.length > 0 && (
                  <div className="inline-flex flex-wrap gap-1 mb-2" onClick={(e) => e.stopPropagation()}>
                    {r.tags.map((t) => (
                      <button key={t} type="button" onClick={() => setQ(t)} className="text-xs rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 hover:opacity-80">
                        #<Highlight text={t} needle={q} />
                      </button>
                    ))}
                  </div>
                )}
                {q && r.content ? (
                  <p className="text-sm text-muted-foreground line-clamp-4">
                    <Highlight text={snippet(stripHtml(r.content), q)} needle={q} />
                  </p>
                ) : r.content && (
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
            <TagsInput value={editValue.tags} onChange={(tags) => setEditValue((v) => ({ ...v, tags }))} />
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
            <TagsInput value={newValue.tags} onChange={(tags) => setNewValue((v) => ({ ...v, tags }))} />
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

      {/* Outline */}
      <Sheet open={outlineOpen} onOpenChange={setOutlineOpen}>
        <SheetContent side="left" className="overflow-y-auto sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Outline</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            {[...folders.map((f) => ({ id: f.id as string | null, name: f.name, color: f.color })), { id: null, name: folders.length ? "Unassigned" : "All rules", color: undefined as string | undefined }]
              .map((g) => ({ ...g, items: rows.filter((r) => (r.folder_id ?? null) === g.id) }))
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <div key={g.id ?? "none"}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    {g.color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />}
                    {g.name} <span className="font-normal">({g.items.length})</span>
                  </div>
                  <ul className="space-y-0.5">
                    {g.items.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="w-full text-left text-sm rounded px-2 py-1 hover:bg-muted flex items-center gap-1.5"
                          onClick={() => { setOutlineOpen(false); setPreviewing(r); }}
                        >
                          {r.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                          <span className="truncate">{r.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </SheetContent>
      </Sheet>
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

function TagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map((s) => s.trim().replace(/^#/, "")).filter(Boolean);
    if (parts.length) onChange(Array.from(new Set([...value, ...parts])));
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <Label>Tags</Label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary text-secondary-foreground text-xs px-2 py-0.5">
              #{t}
              <button type="button" aria-label={`Remove tag ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        onBlur={add}
        placeholder="z.B. Dativ, Nebensatz — press Enter"
      />
    </div>
  );
}
