import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// JWT sessions, no DB adapter — keep this file edge-safe (no DB imports) so it
// can run in middleware. The user's email is the per-user key everywhere else.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({ authorization: { params: { scope: "read:user user:email" } } }),
    Google,
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, profile }) {
      if (profile?.email) token.email = profile.email;
      return token;
    },
    session({ session, token }) {
      if (typeof token.email === "string") session.user.email = token.email;
      return session;
    },
  },
});
