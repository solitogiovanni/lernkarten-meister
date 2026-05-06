import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  nouns: z.array(z.string().min(1)).min(1).max(50),
});

export type AutofilledNoun = {
  input: string;
  noun: string;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  meanings: string[];
  themes: string[];
};

export const autofillNouns = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<{ results: AutofilledNoun[]; error: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { results: [], error: "LOVABLE_API_KEY not configured" };
    }

    const systemPrompt = `You are a meticulous German linguistics assistant. For each German noun input, return:
- noun: the noun in correct German singular form, capitalized
- article: "der" | "die" | "das" (lowercase) — null only if it is genuinely impossible
- plural: the German plural form (e.g. "Häuser"), or null if uncountable
- meanings: 1 to 4 Italian translations, each a short noun phrase
- themes: 1 to 3 short Italian thematic tags (e.g. "casa", "cibo", "lavoro", "tempo", "natura", "corpo", "famiglia"), lowercase

Be accurate. If the input has the article (e.g. "der Tisch"), strip it and use it as the article.`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Process these inputs:\n${data.nouns.map((n, i) => `${i + 1}. ${n}`).join("\n")}` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_nouns",
                description: "Return enriched noun data",
                parameters: {
                  type: "object",
                  properties: {
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          input: { type: "string" },
                          noun: { type: "string" },
                          article: { type: "string", enum: ["der", "die", "das"] },
                          plural: { type: "string" },
                          meanings: { type: "array", items: { type: "string" } },
                          themes: { type: "array", items: { type: "string" } },
                        },
                        required: ["input", "noun", "meanings", "themes"],
                      },
                    },
                  },
                  required: ["items"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_nouns" } },
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) return { results: [], error: "AI rate limit hit, please try again in a moment." };
        if (resp.status === 402) return { results: [], error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." };
        return { results: [], error: `AI error (${resp.status})` };
      }

      const json = await resp.json();
      const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) return { results: [], error: "AI did not return data" };
      const parsed = JSON.parse(args);
      const items = (parsed.items ?? []) as Array<Partial<AutofilledNoun> & { input: string; noun: string }>;

      const results: AutofilledNoun[] = items.map((it) => ({
        input: it.input,
        noun: it.noun,
        article: (it.article as "der" | "die" | "das") ?? null,
        plural: it.plural ?? null,
        meanings: it.meanings ?? [],
        themes: it.themes ?? [],
      }));

      return { results, error: null };
    } catch (e) {
      console.error("autofillNouns failed:", e);
      return { results: [], error: e instanceof Error ? e.message : "Unknown error" };
    }
  });
