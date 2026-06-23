import { auth } from "@/auth";
import { isPreviewDeploy } from "@/lib/preview";
import { NextResponse } from "next/server";

// Auth.js gate: page loads without a valid session redirect to /login; API calls
// get a 401. A session must include an email (our per-user key) — a partial JWT
// from a broken OAuth round-trip is treated as signed-out.
// Preview deploys skip login — OAuth callbacks aren't registered for preview URLs.
export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (isPreviewDeploy()) {
    if (pathname === "/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  const email = req.auth?.user?.email;
  if (req.auth && email) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icon-192.png|icon-512.png|apple-touch-icon.png).*)",
  ],
};
