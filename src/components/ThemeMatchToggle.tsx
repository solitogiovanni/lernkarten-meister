export type ThemeMatchMode = "any" | "all";

/**
 * Any / All switch for the theme filter. Only meaningful with 2+ themes,
 * so the deck pages render it conditionally.
 */
export function ThemeMatchToggle({
  mode,
  onChange,
}: {
  mode: ThemeMatchMode;
  onChange: (mode: ThemeMatchMode) => void;
}) {
  const base = "text-xs px-2 py-0.5 border transition-colors";
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Match</span>
      <div className="inline-flex rounded-full overflow-hidden">
        <button
          type="button"
          onClick={() => onChange("any")}
          className={`${base} rounded-l-full ${
            mode === "any"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Any
        </button>
        <button
          type="button"
          onClick={() => onChange("all")}
          className={`${base} rounded-r-full border-l-0 ${
            mode === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
      </div>
    </div>
  );
}
