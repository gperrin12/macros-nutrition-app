import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight gate so a public deploy isn't wide open (and randoms can't spend
// your API key). It's intentionally minimal — replace with real auth
// (Auth.js / Clerk) when you build the iOS app and need real sessions/tokens.
// If APP_PASSWORD is unset (e.g. local dev), this does nothing.
export function middleware(req: NextRequest) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/auth") return NextResponse.next();

  const authed = req.cookies.get("macros_session")?.value === pw;
  if (authed) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
