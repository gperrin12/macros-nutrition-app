export const runtime = "nodejs";

export async function POST(req: Request) {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return Response.json({ error: "auth disabled" }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { password?: string };
  if (!body.password || body.password !== pw) {
    return Response.json({ error: "wrong password" }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  res.headers.append(
    "set-cookie",
    `macros_session=${encodeURIComponent(pw)}; HttpOnly; Path=/; Max-Age=31536000; SameSite=Lax${
      process.env.NODE_ENV === "production" ? "; Secure" : ""
    }`,
  );
  return res;
}
