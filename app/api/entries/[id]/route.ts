import { sql, ensureSchema } from "@/lib/db";
import { requireEmail } from "@/lib/session";

export const runtime = "nodejs";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireEmail();
  if ("error" in session) return session.error;
  await ensureSchema();
  const { id } = await params;
  await sql`DELETE FROM entries WHERE id = ${id} AND user_id = ${session.email}`;
  return Response.json({ ok: true });
}
