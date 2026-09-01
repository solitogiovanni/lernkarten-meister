import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeKind = "noun" | "verb" | "adjective" | "adverb" | "preposition" | "pronoun" | "conjunction";

type Row = { themes: string[] | null; created_at: string | null };

/**
 * Theme suggestions for a deck kind: the most recently used themes first,
 * followed by all remaining themes in alphabetical order.
 */
export function useThemeSuggestions(kind: ThemeKind, enabled = true) {
  const [recentThemes, setRecentThemes] = useState<string[]>([]);
  const [allThemes, setAllThemes] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const sb: any = supabase;
      let query;
      if (kind === "noun") query = sb.from("nouns").select("themes,created_at");
      else if (kind === "verb") query = sb.from("verbs").select("themes,created_at");
      else query = sb.from("words").select("themes,created_at").eq("kind", kind);
      const { data } = await query.order("created_at", { ascending: false }).limit(400);
      if (cancelled || !data) return;
      const rows = data as Row[];
      const seen = new Set<string>();
      const recent: string[] = [];
      for (const r of rows) {
        for (const t of r.themes ?? []) {
          if (!seen.has(t)) { seen.add(t); recent.push(t); }
        }
        if (recent.length >= 6) break;
      }
      const all = new Set<string>();
      for (const r of rows) for (const t of r.themes ?? []) all.add(t);
      setRecentThemes(recent.slice(0, 6));
      setAllThemes(Array.from(all).sort());
    })();
    return () => { cancelled = true; };
  }, [kind, enabled]);

  return { recentThemes, allThemes };
}
