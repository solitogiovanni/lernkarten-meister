import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/supabase-fetch";

/**
 * Global theme registry shared by every deck (nouns, verbs, words).
 * All themes are loaded from every table; the 5 most recent come from the
 * recent_themes table (kept up to date by a DB trigger on every card save).
 */

const RECENT_MAX = 5;
let recent: string[] = [];
let all = new Set<string>();
let loadedAt = 0;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const STALE_MS = 15_000;

function notify() {
  for (const l of listeners) l();
}

async function fetchRecent(): Promise<void> {
  const { data } = await (supabase as any)
    .from("recent_themes").select("theme").order("used_at", { ascending: false }).limit(RECENT_MAX);
  const saved = ((data ?? []) as { theme: string }[]).map((r) => r.theme);
  for (const t of saved) all.add(t);
  if (saved.length) recent = saved;
}

async function fetchThemes(): Promise<void> {
  const [nouns, verbs, words] = await Promise.all(
    ["nouns", "verbs", "words"].map((t) => fetchAll<{ themes: string[] | null }>(t, (q) => q.select("themes").order("id"))),
  );
  for (const r of [...nouns.data, ...verbs.data, ...words.data]) {
    for (const t of r.themes ?? []) {
      const v = t.trim();
      if (v) all.add(v);
    }
  }
  await fetchRecent();
  loadedAt = Date.now();
  notify();
}

export function loadGlobalThemes(force = false): Promise<void> {
  if (!force && loadedAt && Date.now() - loadedAt < STALE_MS) return Promise.resolve();
  if (!loading) loading = fetchThemes().catch(() => {}).finally(() => { loading = null; });
  return loading;
}

/** Makes themes available everywhere right away, before any reload. */
export function registerThemes(themes: string[] | undefined | null) {
  if (!themes?.length) return;
  const vals = themes.map((t) => t.trim()).filter(Boolean);
  if (!vals.length) return;
  for (const v of vals) all.add(v);
  recent = Array.from(new Set([...vals, ...recent])).slice(0, RECENT_MAX);
  notify();
  const now = Date.now();
  const rows = vals.map((theme, i) => ({ theme, used_at: new Date(now - i).toISOString() }));
  (supabase as any).from("recent_themes").upsert(rows, { onConflict: "theme" }).then(() => {});
}

export function useGlobalThemes(enabled = true) {
  const [state, setState] = useState(() => ({ recentThemes: recent, allThemes: Array.from(all).sort() }));

  useEffect(() => {
    if (!enabled) return;
    const update = () => setState({ recentThemes: recent, allThemes: Array.from(all).sort() });
    listeners.add(update);
    update();
    loadGlobalThemes().then(update);
    // Always refresh the recent list when a panel opens (saves via trigger).
    fetchRecent().then(notify).catch(() => {});
    const onFocus = () => { loadGlobalThemes(); };
    window.addEventListener("focus", onFocus);
    return () => { listeners.delete(update); window.removeEventListener("focus", onFocus); };
  }, [enabled]);

  return state;
}
