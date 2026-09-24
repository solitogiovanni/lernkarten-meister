import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global theme registry shared by every deck (nouns, verbs, words).
 * Themes are loaded once from all tables and any theme typed in a form is
 * registered immediately so it shows up as a suggestion everywhere.
 */

const RECENT_MAX = 5;
let recent: string[] = [];
let all = new Set<string>();
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

type Row = { themes: string[] | null; created_at: string | null };

async function fetchThemes(): Promise<void> {
  const sb: any = supabase;
  const [nouns, verbs, words] = await Promise.all([
    sb.from("nouns").select("themes,created_at").order("created_at", { ascending: false }).limit(500),
    sb.from("verbs").select("themes,created_at").order("created_at", { ascending: false }).limit(500),
    sb.from("words").select("themes,created_at").order("created_at", { ascending: false }).limit(500),
  ]);
  const rows: Row[] = [
    ...((nouns.data ?? []) as Row[]),
    ...((verbs.data ?? []) as Row[]),
    ...((words.data ?? []) as Row[]),
  ].sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  const seen = new Set<string>();
  const nextRecent: string[] = [];
  for (const r of rows) {
    for (const t of r.themes ?? []) {
      const v = t.trim();
      if (!v) continue;
      all.add(v);
      if (!seen.has(v)) {
        seen.add(v);
        if (nextRecent.length < 8) nextRecent.push(v);
      }
    }
  }
  const { data: rt } = await sb.from("recent_themes").select("theme").order("used_at", { ascending: false }).limit(RECENT_MAX);
  const saved = ((rt ?? []) as { theme: string }[]).map((r) => r.theme);
  for (const t of saved) all.add(t);
  // Locally registered themes stay at the front, they are the freshest.
  recent = Array.from(new Set([...recent, ...(saved.length ? saved : nextRecent)])).slice(0, RECENT_MAX);
  loaded = true;
  notify();
}

export function loadGlobalThemes(force = false): Promise<void> {
  if (force) {
    loaded = false;
    loading = null;
  }
  if (loaded) return Promise.resolve();
  if (!loading) loading = fetchThemes().catch(() => {}).finally(() => { loading = null; });
  return loading;
}

/** Makes themes available everywhere right away, before any reload. */
export function registerThemes(themes: string[] | undefined | null) {
  if (!themes?.length) return;
  let changed = false;
  const touched: string[] = [];
  for (const t of [...themes].reverse()) {
    const v = t.trim();
    if (!v) continue;
    if (!all.has(v)) {
      all.add(v);
      changed = true;
    }
    if (recent[0] !== v) {
      recent = [v, ...recent.filter((x) => x !== v)].slice(0, RECENT_MAX);
      changed = true;
    }
    touched.push(v);
  }
  if (touched.length) {
    const now = Date.now();
    const rows = touched.map((theme, i) => ({ theme, used_at: new Date(now - i).toISOString() }));
    (supabase as any).from("recent_themes").upsert(rows, { onConflict: "theme" }).then(() => {});
  }
  if (changed) notify();
}

export function useGlobalThemes(enabled = true) {
  const [state, setState] = useState(() => ({ recentThemes: recent, allThemes: Array.from(all).sort() }));

  useEffect(() => {
    if (!enabled) return;
    const update = () => setState({ recentThemes: recent, allThemes: Array.from(all).sort() });
    listeners.add(update);
    loadGlobalThemes().then(update);
    update();
    return () => { listeners.delete(update); };
  }, [enabled]);

  return state;
}
