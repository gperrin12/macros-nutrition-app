import { sql, ensureSchema } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureSchema();
  const { id } = await params;
  await sql`DELETE FROM entries WHERE id = ${id}`;
  return Response.json({ ok: true });
}
