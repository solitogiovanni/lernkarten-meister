export const RATING_OPTIONS = [
  { v: "again", label: "Again", on: "bg-rose-600 text-white border-rose-600", text: "text-rose-600 dark:text-rose-400" },
  { v: "hard", label: "Hard", on: "bg-amber-500 text-white border-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { v: "good", label: "Good", on: "bg-emerald-600 text-white border-emerald-600", text: "text-emerald-600 dark:text-emerald-400" },
  { v: "easy", label: "Easy", on: "bg-sky-600 text-white border-sky-600", text: "text-sky-600 dark:text-sky-400" },
] as const;

/** Toggle chips: pick any combination of last ratings. */
export function RatingFilter({
  value,
  onChange,
  counts,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {RATING_OPTIONS.map((c) => {
        const on = value.includes(c.v);
        return (
          <button
            key={c.v}
            type="button"
            onClick={() => onChange(on ? value.filter((x) => x !== c.v) : [...value, c.v])}
            className={`px-2.5 py-0.5 rounded-full border text-xs transition-colors ${on ? c.on : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {c.label}
            {counts ? ` (${counts[c.v] ?? 0})` : ""}
          </button>
        );
      })}
    </div>
  );
}

export function RatingBadge({ rating, at }: { rating?: string | null; at?: string | null }) {
  const o = RATING_OPTIONS.find((x) => x.v === rating);
  if (!o) return null;
  let ago = "";
  if (at) {
    const d = Math.floor((Date.now() - new Date(at).getTime()) / 86400000);
    ago = d <= 0 ? " · today" : ` · ${d}d ago`;
  }
  return <span className={`text-xs font-medium ${o.text}`}>● {o.label}{ago}</span>;
}

export function countRatings(rows: { last_rating?: string | null }[]) {
  const c: Record<string, number> = {};
  for (const r of rows) if (r.last_rating) c[r.last_rating] = (c[r.last_rating] ?? 0) + 1;
  return c;
}
