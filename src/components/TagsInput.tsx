import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function normalizeTag(s: string) {
  return s.trim().replace(/^#+/, "").trim();
}

export function TagsInput({ value, onChange, label = "Tags" }: { value: string[]; onChange: (v: string[]) => void; label?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const parts = draft.split(",").map(normalizeTag).filter(Boolean);
    if (parts.length) onChange(Array.from(new Set([...(value ?? []), ...parts])));
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {value?.length > 0 && (
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
        placeholder="z.B. Dativ, A2, trennbar — press Enter"
      />
    </div>
  );
}

/** Clickable #tag chips; clicking runs a search for that tag. */
export function TagChips({ tags, onClick }: { tags?: string[] | null; onClick?: (t: string) => void }) {
  if (!tags?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
      {tags.map((t) => (
        <span
          key={t}
          role="button"
          tabIndex={0}
          onClick={() => onClick?.(t)}
          onKeyDown={(e) => { if (e.key === "Enter") onClick?.(t); }}
          className="text-[11px] rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 hover:opacity-80"
        >
          #{t}
        </span>
      ))}
    </div>
  );
}
