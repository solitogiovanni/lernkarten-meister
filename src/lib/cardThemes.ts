import { supabase } from "@/integrations/supabase/client";
import { registerThemes } from "@/lib/themeStore";

export type ThemeDeckKind = "noun" | "verb" | "adjective" | "adverb" | "preposition" | "pronoun" | "conjunction";

function tableFor(kind: ThemeDeckKind): "nouns" | "verbs" | "words" {
  if (kind === "noun") return "nouns";
  if (kind === "verb") return "verbs";
  return "words";
}

/**
 * Adds or removes a theme on a stored card and returns the new theme list.
 * Throws the Supabase error on failure so callers can toast and keep state.
 */
export async function toggleCardTheme(
  kind: ThemeDeckKind,
  id: string,
  theme: string,
  add: boolean,
  currentThemes: string[],
): Promise<string[]> {
  const themes = add
    ? Array.from(new Set([...currentThemes, theme]))
    : currentThemes.filter((t) => t !== theme);
  const { error } = await (supabase as any)
    .from(tableFor(kind))
    .update({ themes })
    .eq("id", id);
  if (error) throw error;
  if (add) registerThemes([theme]);
  return themes;
}
