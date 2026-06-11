import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// JWT sessions, no DB adapter — keep this file edge-safe (no DB imports) so it
// can run in middleware. The user's email is the per-user key everywhere else.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub, Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
});
