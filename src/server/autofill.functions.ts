import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NounsInput = z.object({
  nouns: z.array(z.string().min(1)).min(1).max(50),
});

export type AutofilledNoun = {
  input: string;
  noun: string;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  meanings: string[];
  themes: string[];
  examples: string[];
};

export const autofillNouns = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => NounsInput.parse(data))
  .handler(async ({ data }): Promise<{ results: AutofilledNoun[]; error: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { results: [], error: "LOVABLE_API_KEY not configured" };

    const systemPrompt = `You are a meticulous German linguistics assistant. For each German noun input, return:
- noun: the noun in correct German singular form, capitalized
- article: "der" | "die" | "das" (lowercase) — null only if it is genuinely impossible
- plural: the German plural form (e.g. "Häuser"), or null if uncountable
- meanings: 1 to 4 Italian translations, each a short noun phrase
- themes: 1 to 3 short Italian thematic tags (e.g. "casa", "cibo", "lavoro", "tempo", "natura", "corpo", "famiglia"), lowercase
- examples: exactly 2 short, natural German example sentences using the noun

Be accurate. If the input has the article (e.g. "der Tisch"), strip it and use it as the article.`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Process these inputs:\n${data.nouns.map((n, i) => `${i + 1}. ${n}`).join("\n")}` },
          ],
          tools: [{
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
                        examples: { type: "array", items: { type: "string" } },
                      },
                      required: ["input", "noun", "meanings", "themes", "examples"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          }],
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
        examples: it.examples ?? [],
      }));
      return { results, error: null };
    } catch (e) {
      console.error("autofillNouns failed:", e);
      return { results: [], error: e instanceof Error ? e.message : "Unknown error" };
    }
  });

const WordsInput = z.object({
  kind: z.enum(["adjective", "adverb", "preposition", "pronoun", "conjunction"]),
  words: z.array(z.string().min(1)).min(1).max(50),
});

export type AutofilledWord = {
  input: string;
  word: string;
  meanings: string[];
  themes: string[];
  examples: string[];
};

export const autofillWords = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => WordsInput.parse(data))
  .handler(async ({ data }): Promise<{ results: AutofilledWord[]; error: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { results: [], error: "LOVABLE_API_KEY not configured" };

    const kindLabel = data.kind === "adjective" ? "adjective" : "adverb";
    const systemPrompt = `You are a meticulous German linguistics assistant. For each German ${kindLabel} input, return:
- word: the ${kindLabel} in correct German base form (lowercase)
- meanings: 1 to 4 Italian translations, each a short phrase
- themes: 1 to 3 short Italian thematic tags (e.g. "qualità", "tempo", "frequenza", "modo", "luogo", "quantità"), lowercase
- examples: exactly 2 short, natural German example sentences using the ${kindLabel}

Be accurate.`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Process these ${kindLabel}s:\n${data.words.map((n, i) => `${i + 1}. ${n}`).join("\n")}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_words",
              description: `Return enriched ${kindLabel} data`,
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        input: { type: "string" },
                        word: { type: "string" },
                        meanings: { type: "array", items: { type: "string" } },
                        themes: { type: "array", items: { type: "string" } },
                        examples: { type: "array", items: { type: "string" } },
                      },
                      required: ["input", "word", "meanings", "themes", "examples"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_words" } },
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
      const items = (parsed.items ?? []) as Array<Partial<AutofilledWord> & { input: string; word: string }>;
      const results: AutofilledWord[] = items.map((it) => ({
        input: it.input,
        word: it.word,
        meanings: it.meanings ?? [],
        themes: it.themes ?? [],
        examples: it.examples ?? [],
      }));
      return { results, error: null };
    } catch (e) {
      console.error("autofillWords failed:", e);
      return { results: [], error: e instanceof Error ? e.message : "Unknown error" };
    }
  });

const VerbsInput = z.object({
  verbs: z.array(z.string().min(1)).min(1).max(50),
});

export type VerbPreposition = {
  preposition: string;
  case: "akk" | "dat" | "gen" | null;
  meaning: string;
};

export type AutofilledVerb = {
  input: string;
  present: string;
  praeteritum: string | null;
  perfect: string | null;
  prepositions: VerbPreposition[];
  meanings: string[];
  themes: string[];
  examples: string[];
};

// ============ Mixed import (auto-classify) ============

const MixedInput = z.object({
  lines: z.array(z.string().min(1)).min(1).max(50),
});

export type MixedKind = "noun" | "verb" | "adjective" | "adverb" | "preposition" | "pronoun" | "conjunction";

export type MixedItem = {
  input: string;
  kind: MixedKind;
  // noun
  noun?: string;
  article?: "der" | "die" | "das" | null;
  plural?: string | null;
  // verb
  present?: string;
  praeteritum?: string | null;
  perfect?: string | null;
  prepositions?: VerbPreposition[];
  // adjective/adverb
  word?: string;
  // common
  meanings: string[];
  themes: string[];
  examples: string[];
};

export const autofillMixed = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => MixedInput.parse(data))
  .handler(async ({ data }): Promise<{ results: MixedItem[]; error: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { results: [], error: "LOVABLE_API_KEY not configured" };

    const systemPrompt = `You are a meticulous German linguistics assistant. For EACH input line, decide whether it is a German noun, verb, adjective, adverb, preposition, pronoun, or conjunction, then return an item with the appropriate fields.

Each input may be just the German word, or "word = meaning1, meaning2", or "der Word = meaning". Strip any "= meaning" part — those meanings are user-provided and should be ignored here (they will be merged on the client). Identify the German word and classify it.

For EVERY item return:
- input: the original line, exactly as given
- kind: "noun" | "verb" | "adjective" | "adverb" | "preposition" | "pronoun" | "conjunction"
- meanings: 1 to 4 short Italian translations
- themes: 1 to 3 short lowercase Italian thematic tags
- examples: at least 2 short, natural German example sentences using the word

If kind = "noun", also return:
- noun: capitalized singular German noun
- article: "der" | "die" | "das"
- plural: German plural form, or null if uncountable

If kind = "verb", also return:
- present: infinitive, lowercase
- praeteritum: 3rd person singular Präteritum
- perfect: Perfekt 3rd person singular WITH the auxiliary verb (e.g. "ist gegangen")
- prepositions: array of {preposition, case ("akk"|"dat"|"gen"), meaning}, only for prepositions the verb genuinely governs. Empty array if none. If non-empty, include at least one example per preposition (total examples = max(2, number_of_prepositions + 1)).

If kind = "adjective", "adverb", "preposition", "pronoun" or "conjunction", also return:
- word: base form, lowercase

Be accurate. Lowercase verbs/adjectives/adverbs/prepositions/pronouns/conjunctions, capitalize nouns.`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Process these inputs:\n${data.lines.map((n, i) => `${i + 1}. ${n}`).join("\n")}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_mixed",
              description: "Return classified and enriched items",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        input: { type: "string" },
                        kind: { type: "string", enum: ["noun", "verb", "adjective", "adverb"] },
                        noun: { type: "string" },
                        article: { type: "string", enum: ["der", "die", "das"] },
                        plural: { type: "string" },
                        present: { type: "string" },
                        praeteritum: { type: "string" },
                        perfect: { type: "string" },
                        prepositions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              preposition: { type: "string" },
                              case: { type: "string", enum: ["akk", "dat", "gen"] },
                              meaning: { type: "string" },
                            },
                            required: ["preposition"],
                          },
                        },
                        word: { type: "string" },
                        meanings: { type: "array", items: { type: "string" } },
                        themes: { type: "array", items: { type: "string" } },
                        examples: { type: "array", items: { type: "string" } },
                      },
                      required: ["input", "kind", "meanings", "themes", "examples"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_mixed" } },
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
      const items = (parsed.items ?? []) as Array<any>;
      const results: MixedItem[] = items.map((it) => ({
        input: String(it.input ?? ""),
        kind: (it.kind as MixedKind) ?? "noun",
        noun: it.noun ?? undefined,
        article: (it.article as "der" | "die" | "das" | undefined) ?? null,
        plural: it.plural ?? null,
        present: it.present ?? undefined,
        praeteritum: it.praeteritum ?? null,
        perfect: it.perfect ?? null,
        prepositions: (it.prepositions ?? []).map((p: any) => ({
          preposition: p.preposition ?? "",
          case: (p.case as "akk" | "dat" | "gen" | undefined) ?? null,
          meaning: p.meaning ?? "",
        })),
        word: it.word ?? undefined,
        meanings: it.meanings ?? [],
        themes: it.themes ?? [],
        examples: it.examples ?? [],
      }));
      return { results, error: null };
    } catch (e) {
      console.error("autofillMixed failed:", e);
      return { results: [], error: e instanceof Error ? e.message : "Unknown error" };
    }
  });

export const autofillVerbs = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => VerbsInput.parse(data))
  .handler(async ({ data }): Promise<{ results: AutofilledVerb[]; error: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { results: [], error: "LOVABLE_API_KEY not configured" };

    const systemPrompt = `You are a meticulous German linguistics assistant. For each German verb input, return:
- present: the verb in infinitive form, lowercase (e.g. "gehen", "warten")
- praeteritum: 3rd person singular Präteritum (e.g. "ging", "wartete")
- perfect: Perfekt 3rd person singular WITH the auxiliary verb sein/haben prefixed (e.g. "ist gegangen", "hat gewartet")
- prepositions: array of objects {preposition, case, meaning}. Include ONLY prepositions that the verb genuinely governs. case is one of "akk", "dat", "gen". meaning is a short Italian gloss for that construction. Empty array if the verb takes no preposition.
- meanings: 1 to 4 Italian translations, each a short verb phrase (infinitive)
- themes: 1 to 3 short Italian thematic tags, lowercase (e.g. "movimento", "comunicazione", "emozioni", "lavoro", "quotidiano")
- examples: at least 2 short, natural German example sentences using the verb. If the verb governs prepositions, you MUST include at least one additional example for EACH preposition that clearly uses the verb together with that preposition in the correct case. Total examples = max(2, number_of_prepositions + 1) at minimum.

Be accurate. If the input includes a preposition (e.g. "warten auf"), use the bare infinitive as present and add the preposition to the prepositions list.`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Process these verbs:\n${data.verbs.map((n, i) => `${i + 1}. ${n}`).join("\n")}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_verbs",
              description: "Return enriched verb data",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        input: { type: "string" },
                        present: { type: "string" },
                        praeteritum: { type: "string" },
                        perfect: { type: "string" },
                        prepositions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              preposition: { type: "string" },
                              case: { type: "string", enum: ["akk", "dat", "gen"] },
                              meaning: { type: "string" },
                            },
                            required: ["preposition"],
                          },
                        },
                        meanings: { type: "array", items: { type: "string" } },
                        themes: { type: "array", items: { type: "string" } },
                        examples: { type: "array", items: { type: "string" } },
                      },
                      required: ["input", "present", "meanings", "themes", "examples"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_verbs" } },
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
      const items = (parsed.items ?? []) as Array<Partial<AutofilledVerb> & { input: string; present: string }>;
      const results: AutofilledVerb[] = items.map((it) => ({
        input: it.input,
        present: it.present,
        praeteritum: it.praeteritum ?? null,
        perfect: it.perfect ?? null,
        prepositions: (it.prepositions ?? []).map((p: any) => ({
          preposition: p.preposition ?? "",
          case: (p.case as "akk" | "dat" | "gen" | undefined) ?? null,
          meaning: p.meaning ?? "",
        })),
        meanings: it.meanings ?? [],
        themes: it.themes ?? [],
        examples: it.examples ?? [],
      }));
      return { results, error: null };
    } catch (e) {
      console.error("autofillVerbs failed:", e);
      return { results: [], error: e instanceof Error ? e.message : "Unknown error" };
    }
  });

// ============ Single-word kind detection (with alternates) ============

const DetectInput = z.object({
  word: z.string().min(1).max(100),
});

export const detectWordKinds = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => DetectInput.parse(data))
  .handler(async ({ data }): Promise<{ results: MixedItem[]; error: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { results: [], error: "LOVABLE_API_KEY not configured" };

    const systemPrompt = `You are a meticulous German linguistics assistant. The user gives ONE German word that could be ambiguous between multiple parts of speech (e.g. "schnell" is an adjective AND adverb; "Essen" is a noun and also relates to verb "essen"; "laut" can be adjective, adverb, or preposition).

Return ALL plausible classifications as separate items (1 to 3 items). Each item must be filled as if it were a standalone entry in that category.

For EACH item return:
- input: the original word
- kind: "noun" | "verb" | "adjective" | "adverb"
- meanings: 1 to 4 short Italian translations specific to that part of speech
- themes: 1 to 3 short lowercase Italian thematic tags
- examples: at least 2 short, natural German example sentences using the word AS that part of speech

If kind = "noun": noun (capitalized singular), article (der/die/das), plural (or null).
If kind = "verb": present (infinitive), praeteritum, perfect (with auxiliary), prepositions (array, possibly empty).
If kind = "adjective" or "adverb": word (lowercase base form).

Only include kinds the word genuinely could be. If the word is unambiguous, return exactly 1 item. Order items from most likely to least likely.`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Classify: ${data.word}` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_candidates",
              description: "Return all plausible classifications",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        input: { type: "string" },
                        kind: { type: "string", enum: ["noun", "verb", "adjective", "adverb"] },
                        noun: { type: "string" },
                        article: { type: "string", enum: ["der", "die", "das"] },
                        plural: { type: "string" },
                        present: { type: "string" },
                        praeteritum: { type: "string" },
                        perfect: { type: "string" },
                        prepositions: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              preposition: { type: "string" },
                              case: { type: "string", enum: ["akk", "dat", "gen"] },
                              meaning: { type: "string" },
                            },
                            required: ["preposition"],
                          },
                        },
                        word: { type: "string" },
                        meanings: { type: "array", items: { type: "string" } },
                        themes: { type: "array", items: { type: "string" } },
                        examples: { type: "array", items: { type: "string" } },
                      },
                      required: ["input", "kind", "meanings", "themes", "examples"],
                    },
                  },
                },
                required: ["items"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_candidates" } },
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
      const items = (parsed.items ?? []) as Array<any>;
      const results: MixedItem[] = items.map((it) => ({
        input: String(it.input ?? data.word),
        kind: (it.kind as MixedKind) ?? "noun",
        noun: it.noun ?? undefined,
        article: (it.article as "der" | "die" | "das" | undefined) ?? null,
        plural: it.plural ?? null,
        present: it.present ?? undefined,
        praeteritum: it.praeteritum ?? null,
        perfect: it.perfect ?? null,
        prepositions: (it.prepositions ?? []).map((p: any) => ({
          preposition: p.preposition ?? "",
          case: (p.case as "akk" | "dat" | "gen" | undefined) ?? null,
          meaning: p.meaning ?? "",
        })),
        word: it.word ?? undefined,
        meanings: it.meanings ?? [],
        themes: it.themes ?? [],
        examples: it.examples ?? [],
      }));
      return { results, error: null };
    } catch (e) {
      console.error("detectWordKinds failed:", e);
      return { results: [], error: e instanceof Error ? e.message : "Unknown error" };
    }
  });
