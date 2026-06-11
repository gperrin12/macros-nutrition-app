import { LOOKUP_MODEL, SYSTEM_PROMPT } from "@/lib/core/prompt";
import { lookupResultSchema } from "@/lib/core/schema";
import type { LookupResult } from "@/lib/core/types";

// Raw REST call so there's one fewer dependency to version-manage. Swap for
// the @anthropic-ai/sdk later if you prefer; the contract is identical.
export async function estimateFood(text: string): Promise<LookupResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: LOOKUP_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!res.ok) {
    throw new Error(`anthropic ${res.status}: ${await res.text().catch(() => "")}`);
  }

  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const raw = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n")
    .trim();

  // Be forgiving: pull the JSON object even if the model wrapped it in prose/fences.
  const match = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : raw);
  return lookupResultSchema.parse(parsed);
}
