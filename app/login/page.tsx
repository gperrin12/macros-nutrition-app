import { signIn } from "@/auth";
import { COLORS } from "@/lib/core/theme";

// Server component: each provider button is a server-action form that kicks off
// the OAuth flow via Auth.js. Keeps the amber-CRT terminal look, no client JS.
export default function Login() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18, justifyContent: "center" }}>
          <span style={{ color: COLORS.accent, fontSize: 18, letterSpacing: 1 }}>macros</span>
          <span className="cur" style={{ fontSize: 18 }}>▊</span>
        </div>
        <div style={{ color: COLORS.dim, fontSize: 12, textAlign: "center", marginBottom: 14 }}>
          // sign in to your log
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: "/" });
            }}
          >
            <button className="btn" type="submit" style={{ width: "100%", padding: "9px 12px" }}>
              &gt; SIGN IN WITH GITHUB
            </button>
          </form>
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button className="btn" type="submit" style={{ width: "100%", padding: "9px 12px" }}>
              &gt; SIGN IN WITH GOOGLE
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
