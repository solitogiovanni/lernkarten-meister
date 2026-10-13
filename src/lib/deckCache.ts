import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/supabase-fetch";

/**
 * In-memory (per browser session) cache for deck lists + lazily loaded images.
 * The database stays the source of truth: cached rows are shown instantly,
 * then fresh rows are always fetched in the background.
 */
const rowCache = new Map<string, any[]>();
const imageCache = new Map<string, Map<string, string | null>>();

function imgMap(table: string) {
  let m = imageCache.get(table);
  if (!m) { m = new Map(); imageCache.set(table, m); }
  return m;
}

function withImages<T extends { id: string }>(table: string, rows: T[]): T[] {
  const m = imgMap(table);
  return rows.map((r) => ({ ...r, image_url: (r as any).image_url ?? m.get(r.id) ?? null }));
}

export async function loadDeck<T extends { id: string }>(opts: {
  key: string;
  table: string;
  /** builder WITHOUT image_url in select */
  build: (q: any) => any;
  setRows: (rows: T[]) => void;
  setLoading: (b: boolean) => void;
  onError?: (msg: string) => void;
}) {
  const { key, table, build, setRows, setLoading, onError } = opts;
  const cached = rowCache.get(key) as T[] | undefined;
  if (cached) { setRows(withImages(table, cached)); setLoading(false); }
  else setLoading(true);

  const { data, error } = await fetchAll<T>(table, build);
  if (error) onError?.(error.message);
  if (!error || !cached) {
    rowCache.set(key, data);
    setRows(withImages(table, data));
  }
  setLoading(false);

  // Background: fetch images not yet cached, in small batches.
  const m = imgMap(table);
  const missing = data.map((r) => r.id).filter((id) => !m.has(id));
  if (missing.length === 0) return;
  const BATCH = 40;
  for (let i = 0; i < missing.length; i += BATCH) {
    const ids = missing.slice(i, i + BATCH);
    const { data: imgs, error: e } = await (supabase as any)
      .from(table).select("id,image_url").in("id", ids).not("image_url", "is", null);
    if (e) return;
    for (const id of ids) m.set(id, null);
    for (const r of imgs ?? []) m.set(r.id, r.image_url);
    if ((imgs ?? []).length > 0) {
      const latest = rowCache.get(key) as T[] | undefined;
      if (latest) setRows(withImages(table, latest));
    }
  }
}

/** Call after saving a card so a changed picture is refetched. */
export function forgetImage(table: string, id: string) {
  imgMap(table).delete(id);
}

export function setCachedImage(table: string, id: string, url: string | null) {
  imgMap(table).set(id, url);
}
