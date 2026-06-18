import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// Shared guest identity — scoped per deployment host via the session cookie.
export const GUEST_EMAIL = "guest@macros.local";

// Only register providers with credentials present — avoids a half-configured
// provider breaking all auth on Vercel when env vars are missing.
const providers: Provider[] = [];
if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(GitHub({ authorization: { params: { scope: "read:user user:email" } } }));
}
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}
providers.push(
  Credentials({
    id: "guest",
    name: "Guest",
    credentials: {},
    authorize() {
      return { id: "guest", name: "Guest", email: GUEST_EMAIL };
    },
  }),
);

// JWT sessions, no DB adapter — keep this file edge-safe (no DB imports) so it
// can run in middleware. The user's email is the per-user key everywhere else.
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // Vercel / reverse-proxy: trust X-Forwarded-Host
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user, profile }) {
      const email = profile?.email ?? user?.email;
      if (email) token.email = email;
      return token;
    },
    session({ session, token }) {
      if (typeof token.email === "string") session.user.email = token.email;
      return session;
    },
  },
});
