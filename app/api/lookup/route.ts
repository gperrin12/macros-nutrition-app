import { estimateFood } from "@/lib/anthropic";
import { lookupRequestSchema } from "@/lib/core/schema";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }

  const parsed = lookupRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "expected { text: string }" }, { status: 400 });

  try {
    const result = await estimateFood(parsed.data.text);
    if (result.items.length === 0) {
      return Response.json({ error: "no items parsed" }, { status: 422 });
    }
    return Response.json(result);
  } catch (e) {
    console.error("[lookup]", e);
    return Response.json({ error: "lookup failed" }, { status: 502 });
  }
}
