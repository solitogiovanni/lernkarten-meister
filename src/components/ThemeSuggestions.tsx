import { useMemo, useState } from "react";
import { useGlobalThemes } from "@/lib/themeStore";
import { fold } from "@/lib/normalize";

/** Recent 5 + global themes from every deck, with live search. */
export function ThemeSuggestions({ values, onAdd }: { values: string[]; onAdd: (t: string) => void }) {
  const { recentThemes, allThemes } = useGlobalThemes();
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const ordered = Array.from(new Set([...recentThemes, ...allThemes])).filter((t) => !values.includes(t));
    const f = fold(q.trim());
    return f ? ordered.filter((t) => fold(t).includes(f)).slice(0, 30) : ordered.slice(0, 12);
  }, [recentThemes, allThemes, values, q]);
  return (
    <div className="mt-2 space-y-1.5">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search all themes…"
        className="w-full h-8 rounded-md border bg-background px-2 text-xs"
      />
      <div className="flex flex-wrap gap-1.5">
        {list.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { onAdd(t); setQ(""); }}
            className={`text-xs px-2 py-0.5 rounded-full border border-dashed hover:border-primary hover:text-foreground transition-colors ${recentThemes.includes(t) ? "text-foreground border-primary/60" : "text-muted-foreground"}`}
          >
            + {t}
          </button>
        ))}
        {list.length === 0 && q && <span className="text-xs text-muted-foreground">No matching theme — type it above to create it.</span>}
      </div>
    </div>
  );
}
