import { auth, GUEST_EMAIL } from "@/auth";
import { isPreviewDeploy } from "@/lib/preview";

// Resolve the signed-in user's email (our per-user key) for API routes.
// Returns either { email } or a ready-to-return 401 Response.
export async function requireEmail(): Promise<{ email: string } | { error: Response }> {
  const session = await auth();
  const email = session?.user?.email;
  if (email) return { email };
  if (isPreviewDeploy()) return { email: GUEST_EMAIL };
  return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
}
