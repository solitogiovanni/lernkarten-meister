import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  word: z.string().min(1).max(120),
  hint: z.string().max(200).optional(),
});

/**
 * Generates a small colourful illustration for a vocabulary card.
 * Returns a base64 PNG (no data-url prefix) that the client downscales
 * and stores inline on the card.
 */
export const generateCardImage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<{ b64: string | null; error: string | null }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) return { b64: null, error: "LOVABLE_API_KEY not configured" };

    const subject = data.hint?.trim() ? data.hint.trim() : data.word.trim();
    const prompt =
      `A simple, friendly, colourful illustration that clearly represents "${subject}". ` +
      `Full colour (never black and white), bright and cheerful, one single clear subject, ` +
      `plain light background, no text, no letters, no words, no watermark.`;

    try {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) return { b64: null, error: "AI rate limit hit, please try again in a moment." };
        if (resp.status === 402) return { b64: null, error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." };
        const text = await resp.text().catch(() => "");
        return { b64: null, error: `Image error (${resp.status}) ${text.slice(0, 160)}` };
      }

      const json = (await resp.json()) as { data?: Array<{ b64_json?: string }> };
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) return { b64: null, error: "No image was returned" };
      return { b64, error: null };
    } catch (e) {
      console.error("generateCardImage failed:", e);
      return { b64: null, error: e instanceof Error ? e.message : "Unknown error" };
    }
  });
