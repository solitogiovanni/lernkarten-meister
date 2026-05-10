import { supabase } from "@/integrations/supabase/client";

const PAGE = 1000;

/**
 * Fetch all rows from a table, paginating past Supabase's 1000-row default cap.
 * Pass a builder callback that applies select/eq/order/in filters; do NOT call .range or .limit.
 */
export async function fetchAll<T = any>(
  table: string,
  build: (q: any) => any,
): Promise<{ data: T[]; error: any }> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const to = from + PAGE - 1;
    const q = build((supabase as any).from(table)).range(from, to);
    const { data, error } = await q;
    if (error) return { data: out, error };
    const chunk = (data ?? []) as T[];
    out.push(...chunk);
    if (chunk.length < PAGE) break;
  }
  return { data: out, error: null };
}
